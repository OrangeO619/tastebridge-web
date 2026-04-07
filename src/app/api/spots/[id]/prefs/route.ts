import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getRequestUserId } from "@/lib/supabase/request-user";
import {
  rowToPref,
  summarizePrefs,
  type PrefRow,
} from "@/types/pref";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(id: string): boolean {
  return uuidRegex.test(id);
}

const dimensionsSchema = z
  .object({
    taste: z.number().min(1).max(5),
    ambiance: z.number().min(1).max(5),
    service: z.number().min(1).max(5),
    value: z.number().min(1).max(5),
  })
  .optional();

const postBodySchema = z.object({
  userId: z.string().min(1).optional(),
  overall: z.number().int().min(1).max(5),
  emoji: z.string().optional(),
  moodTag: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  invitedBy: z.string().optional(),
  isCollaborative: z.boolean().optional().default(false),
  dimensions: dimensionsSchema,
  note: z.string().optional(),
  images: z.array(z.string()).optional().default([]),
  visitDate: z.string().optional(),
});

type RouteCtx = { params: Promise<{ id: string }> };

async function hasSpotAccess(db: ReturnType<typeof createSupabaseAdmin>, spotId: string, userId: string, ownerId: string) {
  if (userId === ownerId) return true;

  const { data } = await db
    .from("collab_invites")
    .select("id")
    .eq("spot_id", spotId)
    .eq("status", "accepted")
    .or(`and(inviter_id.eq.${ownerId},invitee_id.eq.${userId}),and(inviter_id.eq.${userId},invitee_id.eq.${ownerId})`)
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function GET(request: Request, context: RouteCtx) {
  const { id: spotId } = await context.params;

  if (!isUuid(spotId)) {
    return NextResponse.json({ error: "无效的 spot id" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase 环境变量未配置完整" },
      { status: 503 },
    );
  }

  try {
    const supabase = createSupabaseAdmin();
    const requestUserId = await getRequestUserId(request);

    const { data: spot, error: spotErr } = await supabase
      .from("spots")
      .select("id,created_by")
      .eq("id", spotId)
      .maybeSingle();

    if (spotErr) {
      return NextResponse.json(
        { error: `查询店铺失败: ${spotErr.message}` },
        { status: 500 },
      );
    }
    if (!spot) {
      return NextResponse.json({ error: "店铺不存在" }, { status: 404 });
    }

    if (requestUserId) {
      const ok = await hasSpotAccess(supabase, spotId, requestUserId, spot.created_by);
      if (!ok) return NextResponse.json({ error: "无权限查看该点位协作记录" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("pref_records")
      .select("*")
      .eq("spot_id", spotId)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `读取喜爱记录失败: ${error.message}` },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as PrefRow[];
    const prefs = rows.map(rowToPref);
    const summary = summarizePrefs(prefs);

    return NextResponse.json({ prefs, summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteCtx) {
  const { id: spotId } = await context.params;

  if (!isUuid(spotId)) {
    return NextResponse.json({ error: "无效的 spot id" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase 环境变量未配置完整" },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const b = parsed.data;
  const requestUserId = await getRequestUserId(request);
  const userId = (b.userId?.trim() || requestUserId).slice(0, 128);
  const now = new Date().toISOString();

  let visitDateStr: string;
  if (b.visitDate) {
    const d = new Date(b.visitDate);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "visitDate 无效" }, { status: 400 });
    }
    visitDateStr = d.toISOString().slice(0, 10);
  } else {
    visitDateStr = now.slice(0, 10);
  }

  try {
    const supabase = createSupabaseAdmin();

    const { data: spot, error: spotErr } = await supabase
      .from("spots")
      .select("id,created_by")
      .eq("id", spotId)
      .maybeSingle();

    if (spotErr) {
      return NextResponse.json(
        { error: `查询店铺失败: ${spotErr.message}` },
        { status: 500 },
      );
    }
    if (!spot) {
      return NextResponse.json({ error: "店铺不存在" }, { status: 404 });
    }

    const canWrite = await hasSpotAccess(supabase, spotId, userId, spot.created_by);
    if (!canWrite) {
      return NextResponse.json({ error: "无共享写入权限，请先接受协作邀请" }, { status: 403 });
    }

    const collaborative = userId !== spot.created_by;

    const { data: existing, error: findErr } = await supabase
      .from("pref_records")
      .select("id, visit_count")
      .eq("spot_id", spotId)
      .eq("user_id", userId)
      .maybeSingle();

    if (findErr) {
      return NextResponse.json(
        { error: `查询记录失败: ${findErr.message}` },
        { status: 500 },
      );
    }

    const basePayload = {
      overall: b.overall,
      emoji: b.emoji ?? null,
      mood_tag: b.moodTag ?? null,
      tags: b.tags,
      invited_by: b.invitedBy ?? null,
      is_collaborative: collaborative || b.isCollaborative,
      dimensions: b.dimensions ?? null,
      note: b.note ?? null,
      images: b.images,
      visit_date: visitDateStr,
      updated_at: now,
    };

    if (existing) {
      const nextCount = (existing.visit_count ?? 1) + 1;
      const { data: updated, error: upErr } = await supabase
        .from("pref_records")
        .update({
          ...basePayload,
          visit_count: nextCount,
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (upErr) {
        return NextResponse.json(
          { error: `更新失败: ${upErr.message}` },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { pref: rowToPref(updated as PrefRow), created: false },
        { status: 200 },
      );
    }

    const { data: inserted, error: insErr } = await supabase
      .from("pref_records")
      .insert({
        spot_id: spotId,
        user_id: userId,
        ...basePayload,
        visit_count: 1,
      })
      .select("*")
      .single();

    if (insErr) {
      return NextResponse.json(
        { error: `写入失败: ${insErr.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { pref: rowToPref(inserted as PrefRow), created: true },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
