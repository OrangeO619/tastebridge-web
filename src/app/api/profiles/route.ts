import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  try {
    const db = createSupabaseAdmin();
    if (query) {
      const { data, error } = await db
        .from("profiles")
        .select("id, display_name, avatar_url")
        .ilike("display_name", `%${query}%`)
        .limit(20);
      if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 });
      const items = (data ?? []).map((row) => ({
        id: row.id,
        displayName: (row.display_name as string) ?? row.id.slice(0, 6),
        avatarUrl: row.avatar_url as string | null,
      }));
      return NextResponse.json({ items });
    }

    if (!ids.length) return NextResponse.json({ profiles: {} });
    const { data } = await db
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);
    const profiles: Record<string, { displayName: string; avatarUrl: string | null }> = {};
    for (const row of data ?? []) {
      profiles[row.id] = {
        displayName: (row.display_name as string) ?? row.id.slice(0, 6),
        avatarUrl: row.avatar_url as string | null,
      };
    }
    return NextResponse.json({ profiles });
  } catch {
    return NextResponse.json({ profiles: {} });
  }
}

export async function PATCH(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  let json: unknown;
  try { json = await request.json(); } catch { return NextResponse.json({ error: "非法 JSON" }, { status: 400 }); }
  const body = json as { displayName?: string; avatarUrl?: string };
  try {
    const db = createSupabaseAdmin();
    const { error } = await db.from("profiles").upsert({
      id: userId,
      display_name: body.displayName ?? null,
      avatar_url: body.avatarUrl ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
