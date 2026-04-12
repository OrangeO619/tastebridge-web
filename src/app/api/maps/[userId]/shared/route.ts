import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type RouteCtx = { params: Promise<{ userId: string }> };

export async function GET(request: Request, context: RouteCtx) {
  const requesterId = request.headers.get("x-user-id")?.trim();
  if (!requesterId) return NextResponse.json({ items: [], error: "未登录" }, { status: 401 });

  const { userId } = await context.params;
  if (requesterId !== userId) return NextResponse.json({ items: [], error: "无权限" }, { status: 403 });

  const db = createSupabaseAdmin();
  const { data, error } = await db
    .from("map_shares")
    .select("id,owner_id,shared_with,permission,created_at")
    .eq("shared_with", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 });

  // Fetch owner profiles separately
  const ownerIds = [...new Set((data ?? []).map((x) => x.owner_id))];
  let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  if (ownerIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id,display_name,avatar_url")
      .in("id", ownerIds);
    profileMap = (profiles ?? []).reduce((acc, p) => {
      acc[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
      return acc;
    }, {} as Record<string, { display_name: string | null; avatar_url: string | null }>);
  }

  return NextResponse.json({
    items: (data ?? []).map((x) => ({
      id: x.id,
      ownerId: x.owner_id,
      sharedWith: x.shared_with,
      permission: x.permission,
      createdAt: x.created_at,
      ownerProfile: profileMap[x.owner_id] ?? null,
    })),
  });
}
