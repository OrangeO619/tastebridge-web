import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { rowToPref, type PrefRow } from "@/types/pref";
import { rowToSpot, type SpotRow } from "@/types/spot";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim();
  if (!userId) {
    return NextResponse.json({ error: "userId \u5fc5\u586b" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase \u672a\u914d\u7f6e" }, { status: 503 });
  }

  try {
    const db = createSupabaseAdmin();
    const { data, error } = await db
      .from("pref_records")
      .select("*, spots(*)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as (PrefRow & { spots: SpotRow | null })[];
    const items = rows.map((row) => ({
      pref: rowToPref(row),
      spot: row.spots ? rowToSpot(row.spots) : null,
    }));

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return Response.json({ error: '未登录' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const prefId = searchParams.get('prefId');
  if (!prefId) return Response.json({ error: '缺少 prefId' }, { status: 400 });
  const db = createSupabaseAdmin();
  const { error } = await db.from('pref_records').delete().eq('id', prefId).eq('user_id', userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}