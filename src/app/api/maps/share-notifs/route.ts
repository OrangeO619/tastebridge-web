import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id")?.trim();
  if (!userId) return NextResponse.json({ items: [], error: "未登录" }, { status: 401 });

  const db = createSupabaseAdmin();
  const { data, error } = await db
    .from("map_share_notifs")
    .select("id,owner_id,permission,created_at")
    .eq("shared_with", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}
