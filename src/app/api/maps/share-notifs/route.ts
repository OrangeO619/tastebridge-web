import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id")?.trim();
  if (!userId) return NextResponse.json({ items: [], error: "未登录" }, { status: 401 });

  const db = createSupabaseAdmin();
  const { data, error } = await db
    .from("map_share_notifs")
    .select("id,owner_id,permission,created_at,read_at")
    .eq("shared_with", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    const { data: shareData, error: shareErr } = await db
      .from("map_shares")
      .select("id,owner_id,permission,created_at")
      .eq("shared_with", userId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (shareErr) return NextResponse.json({ items: [], error: shareErr.message }, { status: 500 });
    const items = (shareData ?? []).map((x) => ({
      id: x.id,
      owner_id: x.owner_id,
      permission: x.permission,
      created_at: x.created_at,
    }));
    return NextResponse.json({ items });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function PATCH(request: Request) {
  const userId = request.headers.get("x-user-id")?.trim();
  if (!userId) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

  const db = createSupabaseAdmin();
  const { error } = await db
    .from("map_share_notifs")
    .update({ read_at: new Date().toISOString() })
    .eq("shared_with", userId)
    .is("read_at", null);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
