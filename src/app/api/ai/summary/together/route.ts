import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type PrefRow = {
  id: string;
  spot_id: string;
  overall: number;
  user_id: string;
  tags: string[] | null;
  mood_tag: string | null;
  emoji: string | null;
  note: string | null;
  images: string[] | null;
  created_at: string;
};

type TogetherAiPayload = {
  insight: string;
  musicSearchQuery: string;
  musicReason: string;
};

async function generateTogetherByQwen(input: {
  userAName: string;
  userBName: string;
  totalCommonVisits: number;
  tasteSimilarity: number;
  moodOverlap: number;
  topCommonSpot: string;
  commonTags: string[];
}) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const model = process.env.DASHSCOPE_MODEL || "qwen-plus-2025-07-28";
  if (!apiKey) return null;

  const prompt = `你是 TasteBridge 的共同回忆助手。\n` +
    `请基于下面数据输出 JSON：{"insight":"...","musicSearchQuery":"歌曲名 歌手","musicReason":"..."}\n` +
    `要求：\n` +
    `1) insight 控制在 50 字以内，温暖、有回忆感，提及两人名字\n` +
    `2) 推荐一首契合两人美食回忆氛围的歌曲（musicSearchQuery 格式：歌曲名 歌手）\n` +
    `3) musicReason 说明推荐依据，25 字以内\n\n` +
    `数据：${JSON.stringify(input)}`;

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
    const parsed = JSON.parse(content) as Partial<TogetherAiPayload>;
    if (!parsed.insight || !parsed.musicSearchQuery || !parsed.musicReason) return null;
    return parsed as TogetherAiPayload;
  } catch {
    return null;
  }
}

async function searchMusic(query: string): Promise<{ id: string; name: string; artist: string; url: string; cover: string } | null> {
  const musicApiUrl = process.env.MUSIC_API_URL;
  if (!musicApiUrl) return null;

  try {
    const searchRes = await fetch(`${musicApiUrl}/search?keywords=${encodeURIComponent(query)}&limit=1`);
    const searchData = (await searchRes.json()) as { result?: { songs?: Array<{ id: number; name: string; artists?: Array<{ name: string }> }> } };
    const song = searchData.result?.songs?.[0];
    if (!song) return null;

    const urlRes = await fetch(`${musicApiUrl}/song/url?id=${song.id}`);
    const urlData = (await urlRes.json()) as { data?: Array<{ url?: string }> };
    const songUrl = urlData.data?.[0]?.url;

    const detailRes = await fetch(`${musicApiUrl}/song/detail?ids=${song.id}`);
    const detailData = (await detailRes.json()) as { songs?: Array<{ al?: { picUrl?: string } }> };
    const cover = detailData.songs?.[0]?.al?.picUrl ?? "";

    return {
      id: String(song.id),
      name: song.name,
      artist: song.artists?.map((a) => a.name).join(", ") ?? "",
      url: songUrl ?? "",
      cover,
    };
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
    db.from("pref_records").select("id,spot_id,overall,user_id,tags,mood_tag,emoji,note,images,created_at").in("user_id", [userA, userB]),
    db.from("spots").select("id,name,address,categories,created_by"),
    db.from("profiles").select("id,display_name,avatar_url").in("id", [userA, userB]),
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
  const profileMap = new Map((profilesRes.data ?? []).map((x) => [x.id, { displayName: x.display_name || x.id.slice(0, 6), avatarUrl: x.avatar_url }]));

  const aPrefs = new Map<string, PrefRow[]>();
  const bPrefs = new Map<string, PrefRow[]>();
  const aTags = new Set<string>();
  const bTags = new Set<string>();
  const aMoods = new Set<string>();
  const bMoods = new Set<string>();

  for (const row of prefs) {
    if (row.user_id === userA) {
      const list = aPrefs.get(row.spot_id) ?? [];
      list.push(row);
      aPrefs.set(row.spot_id, list);
      for (const t of row.tags ?? []) aTags.add(t);
      if (row.mood_tag) aMoods.add(row.mood_tag);
    } else if (row.user_id === userB) {
      const list = bPrefs.get(row.spot_id) ?? [];
      list.push(row);
      bPrefs.set(row.spot_id, list);
      for (const t of row.tags ?? []) bTags.add(t);
      if (row.mood_tag) bMoods.add(row.mood_tag);
    }
  }

  const commonSpotIds = [...aPrefs.keys()].filter((id) => bPrefs.has(id));
  const totalCommonVisits = commonSpotIds.length;

  // Calculate taste similarity (based on common tags)
  const commonTags = [...aTags].filter((t) => bTags.has(t));
  const allTags = new Set([...aTags, ...bTags]);
  const tasteSimilarity = allTags.size > 0 ? Math.round((commonTags.length / allTags.size) * 100) : 0;

  // Calculate mood overlap
  const commonMoods = [...aMoods].filter((m) => bMoods.has(m));
  const allMoods = new Set([...aMoods, ...bMoods]);
  const moodOverlap = allMoods.size > 0 ? Math.round((commonMoods.length / allMoods.size) * 100) : 0;

  // Build common spots with both users' prefs
  const commonSpots = commonSpotIds.map((spotId) => {
    const spot = spotMap.get(spotId);
    const aList = aPrefs.get(spotId) ?? [];
    const bList = bPrefs.get(spotId) ?? [];
    const latestA = aList.sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())[0];
    const latestB = bList.sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())[0];
    const latestDate = [latestA?.created_at, latestB?.created_at].filter(Boolean).sort().reverse()[0] ?? "";

    return {
      spotId,
      name: spot?.name ?? "店铺",
      address: spot?.address ?? "",
      categories: spot?.categories ?? [],
      latestDate,
      userA: {
        id: userA,
        profile: profileMap.get(userA) ?? { displayName: userA.slice(0, 6), avatarUrl: null },
        pref: latestA ? {
          id: latestA.id,
          overall: latestA.overall,
          tags: latestA.tags ?? [],
          moodTag: latestA.mood_tag,
          emoji: latestA.emoji,
          note: latestA.note,
          images: latestA.images ?? [],
          createdAt: latestA.created_at,
        } : null,
      },
      userB: {
        id: userB,
        profile: profileMap.get(userB) ?? { displayName: userB.slice(0, 6), avatarUrl: null },
        pref: latestB ? {
          id: latestB.id,
          overall: latestB.overall,
          tags: latestB.tags ?? [],
          moodTag: latestB.mood_tag,
          emoji: latestB.emoji,
          note: latestB.note,
          images: latestB.images ?? [],
          createdAt: latestB.created_at,
        } : null,
      },
    };
  }).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());

  const topCommonSpot = commonSpots[0]?.name ?? "暂无";
  const userAName = profileMap.get(userA)?.displayName ?? userA.slice(0, 6);
  const userBName = profileMap.get(userB)?.displayName ?? userB.slice(0, 6);

  const fallback: TogetherAiPayload = {
    insight: totalCommonVisits > 0
      ? `${userAName} 和 ${userBName} 一起打卡了 ${totalCommonVisits} 家店，美食是你们最好的共同记忆。`
      : `${userAName} 和 ${userBName} 还没有共同探店记录，先约一顿吧。`,
    musicSearchQuery: "好朋友 李荣浩",
    musicReason: "根据你们的共同回忆和相似的口味偏好推荐。",
  };

  const ai = await generateTogetherByQwen({
    userAName,
    userBName,
    totalCommonVisits,
    tasteSimilarity,
    moodOverlap,
    topCommonSpot,
    commonTags: commonTags.slice(0, 5),
  });

  const music = await searchMusic(ai?.musicSearchQuery ?? fallback.musicSearchQuery);

  return NextResponse.json({
    users: {
      userA: { id: userA, ...profileMap.get(userA) },
      userB: { id: userB, ...profileMap.get(userB) },
    },
    stats: {
      totalCommonVisits,
      tasteSimilarity,
      moodOverlap,
    },
    insight: ai?.insight ?? fallback.insight,
    music: {
      searchQuery: ai?.musicSearchQuery ?? fallback.musicSearchQuery,
      reason: ai?.musicReason ?? fallback.musicReason,
      track: music,
    },
    commonSpots,
  });
}
