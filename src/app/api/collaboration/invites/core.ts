import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type InviteStatus = "pending" | "accepted" | "rejected";

const postSchema = z.object({
  spotId: z.string().uuid(),
  inviteeId: z.string().uuid(),
  note: z.string().max(200).optional(),
});

const patchSchema = z.object({
  inviteId: z.number().int().positive(),
  action: z.enum(["accepted", "rejected", "cancel", "resend"]),
});

export async function getInvites(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ invites: [], error: "未登录" }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const onlyPending = sp.get("pending") === "1";
  const role = sp.get("role") === "inviter" ? "inviter" : "invitee";

  const db = createSupabaseAdmin();
  let q = db
    .from("collab_invites")
    .select("id,spot_id,inviter_id,invitee_id,note,status,created_at,updated_at,read_at,spots(id,name,address)")
    .order("created_at", { ascending: false });

  q = role === "inviter" ? q.eq("inviter_id", userId) : q.eq("invitee_id", userId);
  if (onlyPending) q = q.eq("status", "pending");
  if (sp.get("unread") === "1") q = q.is("read_at", null);

  const { data, error } = await q;
  if (error) return NextResponse.json({ invites: [], error: error.message }, { status: 500 });

  return NextResponse.json({ invites: data ?? [] });
}

export async function createInvite(request: Request) {
  const inviterId = request.headers.get("x-user-id");
  if (!inviterId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "非法 JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const { spotId, inviteeId, note } = parsed.data;
  if (inviteeId === inviterId) return NextResponse.json({ error: "不能邀请自己" }, { status: 400 });

  const db = createSupabaseAdmin();

  const { data: existed } = await db
    .from("collab_invites")
    .select("id")
    .eq("spot_id", spotId)
    .eq("inviter_id", inviterId)
    .eq("invitee_id", inviteeId)
    .eq("status", "pending")
    .maybeSingle();

  if (existed) return NextResponse.json({ ok: true, duplicated: true });

  const { error } = await db.from("collab_invites").insert({
    spot_id: spotId,
    inviter_id: inviterId,
    invitee_id: inviteeId,
    note: note ?? null,
    status: "pending",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function updateInvite(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "非法 JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const { inviteId, action } = parsed.data;

  const db = createSupabaseAdmin();
  const { data: invite, error: findErr } = await db
    .from("collab_invites")
    .select("id,spot_id,inviter_id,invitee_id,status")
    .eq("id", inviteId)
    .maybeSingle();

  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });
  if (!invite) return NextResponse.json({ error: "邀请不存在" }, { status: 404 });

  if (action === "accepted" || action === "rejected") {
    if (invite.invitee_id !== userId) return NextResponse.json({ error: "无权限" }, { status: 403 });
    if (invite.status !== "pending") return NextResponse.json({ error: "邀请已处理" }, { status: 400 });

    const nextStatus: InviteStatus = action;
    const { error: upErr } = await db
      .from("collab_invites")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", inviteId)
      .eq("invitee_id", userId);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    if (nextStatus === "accepted") {
      return NextResponse.json({ ok: true, spotId: invite.spot_id, invitedBy: invite.inviter_id });
    }
    return NextResponse.json({ ok: true });
  }

  if (invite.inviter_id !== userId) return NextResponse.json({ error: "无权限" }, { status: 403 });

  if (action === "cancel") {
    if (invite.status !== "pending") return NextResponse.json({ error: "仅可撤回待处理邀请" }, { status: 400 });
    const { error: upErr } = await db
      .from("collab_invites")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", inviteId)
      .eq("inviter_id", userId);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (invite.status === "pending") return NextResponse.json({ ok: true, duplicated: true });
  const { error: upErr } = await db
    .from("collab_invites")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("inviter_id", userId);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function markInvitesRead(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const inviteId = sp.get("inviteId");

  const db = createSupabaseAdmin();

  // 如果指定了 inviteId，只标记单条
  if (inviteId) {
    const { error } = await db
      .from("collab_invites")
      .update({ read_at: new Date().toISOString() })
      .eq("id", Number(inviteId))
      .eq("invitee_id", userId)
      .is("read_at", null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // 否则标记所有未读
  const { error } = await db
    .from("collab_invites")
    .update({ read_at: new Date().toISOString() })
    .eq("invitee_id", userId)
    .is("read_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
