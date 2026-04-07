import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const bodySchema = z.object({
  sharedWith: z.string().uuid(),
  permission: z.enum(["view", "edit"]),
});

export async function GET(request: Request) {
  const ownerId = request.headers.get("x-user-id")?.trim();
  if (!ownerId) return NextResponse.json({ items: [], error: "未登录" }, { status: 401 });

  const db = createSupabaseAdmin();
  const { data, error } = await db
    .from("map_shares")
    .select("id,owner_id,shared_with,permission,created_at,profiles:shared_with(id,display_name,avatar_url)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 });

  return NextResponse.json({
    items: (data ?? []).map((x) => ({
      id: x.id,
      ownerId: x.owner_id,
      sharedWith: x.shared_with,
      permission: x.permission,
      createdAt: x.created_at,
      sharedWithProfile: Array.isArray(x.profiles) ? x.profiles[0] ?? null : x.profiles ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const ownerId = request.headers.get("x-user-id")?.trim();
  if (!ownerId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "非法 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const { sharedWith, permission } = parsed.data;
  if (sharedWith === ownerId) return NextResponse.json({ error: "不能共享给自己" }, { status: 400 });

  const db = createSupabaseAdmin();
  const { error } = await db.from("map_shares").upsert({
    owner_id: ownerId,
    shared_with: sharedWith,
    permission,
    updated_at: new Date().toISOString(),
  }, { onConflict: "owner_id,shared_with" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("map_share_notifs").insert({
    owner_id: ownerId,
    shared_with: sharedWith,
    permission,
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const ownerId = request.headers.get("x-user-id")?.trim();
  if (!ownerId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "非法 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const { sharedWith, permission } = parsed.data;

  const db = createSupabaseAdmin();
  const { error } = await db
    .from("map_shares")
    .update({ permission, updated_at: new Date().toISOString() })
    .eq("owner_id", ownerId)
    .eq("shared_with", sharedWith);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const ownerId = request.headers.get("x-user-id")?.trim();
  if (!ownerId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sharedWith = searchParams.get("sharedWith")?.trim();
  if (!sharedWith) return NextResponse.json({ error: "缺少 sharedWith" }, { status: 400 });

  const db = createSupabaseAdmin();
  const { error } = await db
    .from("map_shares")
    .delete()
    .eq("owner_id", ownerId)
    .eq("shared_with", sharedWith);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
