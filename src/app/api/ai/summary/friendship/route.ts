import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type PrefRow = {
  spot_id: string;
  overall: number;
  user_id: string;
  tags: string[] | null;
};

type FriendshipAiPayload = {
  insight: string;
  musicSearchQuery: string;
  musicReason: string;
};

async function generateFriendshipByQwen(input: {
  userA: string;
  userB: string;
  totalCommonVisits: number;
  topCommonSpot: string;
  commonCategories: string[];
}) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const model = process.env.DASHSCOPE_MODEL || "qwen-plus-2025-07-28";
  if (!apiKey) return null;

  const prompt = `你是一个美食社交助手。输出 JSON：{"insight":"...","musicSearchQuery":"歌曲名 歌手","musicReason":"..."}。` +
    `用户A：${input.userA}，用户B：${input.userB}，共同探店${input.totalCommonVisits}家，共同最爱店铺：${input.topCommonSpot}，共同偏好菜系：${input.commonCategories.join("、")}`;

  const resp = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "你只输出合法 JSON。" },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as Partial<FriendshipAiPayload>;
    if (!parsed.insight || !parsed.musicSearchQuery || !parsed.musicReason) return null;
    return parsed as FriendshipAiPayload;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const requestUserId = request.headers.get("x-user-id")?.trim();
  const userA = (sp.get("userId")?.trim() || requestUserId || "").trim();
  const userB = (sp.get("friendId")?.trim() || "").trim();

  if (!userA || !userB) return NextResponse.json({ error: "userId 与 friendId 必填" }, { status: 400 });

  const db = createSupabaseAdmin();
  const [prefsRes, spotsRes, profilesRes, shareRes] = await Promise.all([
    db.from("pref_records").select("spot_id,overall,user_id,tags").in("user_id", [userA, userB]),
    db.from("spots").select("id,name,categories,created_by"),
    db.from("profiles").select("id,display_name").in("id", [userA, userB]),
    db.from("map_shares").select("id,permission,owner_id,shared_with").or(`and(owner_id.eq.${userA},shared_with.eq.${userB}),and(owner_id.eq.${userB},shared_with.eq.${userA})`),
  ]);

  if (prefsRes.error) return NextResponse.json({ error: prefsRes.error.message }, { status: 500 });
  if (spotsRes.error) return NextResponse.json({ error: spotsRes.error.message }, { status: 500 });
  if (shareRes.error) return NextResponse.json({ error: shareRes.error.message }, { status: 500 });

  const hasRelationship = (shareRes.data?.length ?? 0) > 0;
  if (!hasRelationship) return NextResponse.json({ error: "你们还没有共享地图关系" }, { status: 403 });

  const prefs = (prefsRes.data ?? []) as PrefRow[];
  const spots = spotsRes.data ?? [];
  const spotMap = new Map(spots.map((s) => [s.id, s]));
  const profiles = new Map((profilesRes.data ?? []).map((x) => [x.id, x.display_name || x.id.slice(0, 6)]));

  const aSpotMap = new Map<string, PrefRow[]>();
  const bSpotMap = new Map<string, PrefRow[]>();
  for (const row of prefs) {
    const target = row.user_id === userA ? aSpotMap : row.user_id === userB ? bSpotMap : null;
    if (!target) continue;
    const list = target.get(row.spot_id) ?? [];
    list.push(row);
    target.set(row.spot_id, list);
  }

  const commonSpotIds = [...aSpotMap.keys()].filter((id) => bSpotMap.has(id));
  const commonCategoriesCount = new Map<string, number>();
  const topSpotRank = commonSpotIds.map((id) => {
    const aAvg = (aSpotMap.get(id) ?? []).reduce((s, x) => s + x.overall, 0) / (aSpotMap.get(id)?.length ?? 1);
    const bAvg = (bSpotMap.get(id) ?? []).reduce((s, x) => s + x.overall, 0) / (bSpotMap.get(id)?.length ?? 1);
    const spot = spotMap.get(id);
    for (const c of spot?.categories ?? []) commonCategoriesCount.set(c, (commonCategoriesCount.get(c) ?? 0) + 1);
    return { id, name: spot?.name ?? "店铺", avg: Math.round((((aAvg + bAvg) / 2) || 0) * 10) / 10 };
  }).sort((a, b) => b.avg - a.avg);

  const totalCommonVisits = commonSpotIds.length;
  const topCommonSpot = topSpotRank[0]?.name ?? "暂无";
  const commonCategories = [...commonCategoriesCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

  const fallback = {
    insight: totalCommonVisits > 0 ? `你们一起打卡了 ${totalCommonVisits} 家店，美食就是最好的共同记忆。` : "你们还没有共同探店记录，先约一顿吧。",
    musicSearchQuery: "最佳损友 陈奕迅",
    musicReason: "送给你们这对美食搭子。",
  };

  const ai = await generateFriendshipByQwen({
    userA: String(profiles.get(userA) ?? userA.slice(0, 6)),
    userB: String(profiles.get(userB) ?? userB.slice(0, 6)),
    totalCommonVisits,
    topCommonSpot,
    commonCategories,
  });

  return NextResponse.json({
    users: {
      userA: { id: userA, name: profiles.get(userA) ?? userA.slice(0, 6) },
      userB: { id: userB, name: profiles.get(userB) ?? userB.slice(0, 6) },
    },
    totalCommonVisits,
    topCommonSpot,
    commonCategories,
    topCommonSpots: topSpotRank.slice(0, 3),
    insight: ai?.insight ?? fallback.insight,
    musicSearchQuery: ai?.musicSearchQuery ?? fallback.musicSearchQuery,
    musicReason: ai?.musicReason ?? fallback.musicReason,
  });
}
