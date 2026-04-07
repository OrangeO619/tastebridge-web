import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ following: [], followers: [], followingProfiles: [] });

  const db = createSupabaseAdmin();
  const [fing, fers] = await Promise.all([
    db.from("follows").select("following_id").eq("follower_id", userId),
    db.from("follows").select("follower_id").eq("following_id", userId),
  ]);

  const followingIds = (fing.data ?? []).map((r) => r.following_id);
  const followerIds = (fers.data ?? []).map((r) => r.follower_id);

  let followingProfiles: Array<{ id: string; displayName: string | null; avatarUrl: string | null }> = [];
  if (followingIds.length > 0) {
    const pr = await db
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", followingIds);
    followingProfiles = (pr.data ?? []).map((x) => ({
      id: x.id,
      displayName: x.display_name,
      avatarUrl: x.avatar_url,
    }));
  }

  return NextResponse.json({
    following: followingIds,
    followers: followerIds,
    followingProfiles,
  });
}

export async function POST(request: Request) {
  const followerId = request.headers.get("x-user-id");
  if (!followerId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = (await request.json()) as { targetId?: string; followingId?: string };
  const targetId = body.targetId ?? body.followingId;

  if (!targetId || targetId === followerId) {
    return NextResponse.json({ error: "非法目标" }, { status: 400 });
  }

  const db = createSupabaseAdmin();
  const { error } = await db.from("follows").upsert(
    { follower_id: followerId, following_id: targetId },
    { onConflict: "follower_id,following_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const followerId = request.headers.get("x-user-id");
  if (!followerId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get("targetId");
  if (!targetId) return NextResponse.json({ error: "缺少 targetId" }, { status: 400 });

  const db = createSupabaseAdmin();
  await db.from("follows").delete().eq("follower_id", followerId).eq("following_id", targetId);
  return NextResponse.json({ ok: true });
}
