import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type PrefMonthlyRow = {
  overall: number;
  tags: string[] | null;
  mood_tag: string | null;
  created_at: string;
  spot_id: string;
};

type MonthlyAiPayload = {
  insight: string;
  musicSearchQuery: string;
  musicReason: string;
};

function fallbackMusic(topMoodTags: string[]): { musicSearchQuery: string; musicReason: string } {
  if (topMoodTags.includes("惊喜")) {
    return { musicSearchQuery: "Lucky Jason Mraz", musicReason: "本月氛围偏惊喜，推荐轻快明亮曲风。" };
  }
  if (topMoodTags.includes("舒服")) {
    return { musicSearchQuery: "Sunday Morning Maroon 5", musicReason: "本月节奏偏松弛，推荐舒展温暖曲风。" };
  }
  if (topMoodTags.includes("踩雷")) {
    return { musicSearchQuery: "Fix You Coldplay", musicReason: "本月有波动情绪，推荐有修复感的旋律。" };
  }
  return { musicSearchQuery: "Best Part Daniel Caesar", musicReason: "根据本月探店节奏推荐一首轻松BGM。" };
}

async function generateMonthlyByQwen(input: {
  totalVisits: number;
  avgRating: number;
  topTags: string[];
  topMoodTags: string[];
  topSpots: Array<{ name: string; avg: number }>;
}) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const model = process.env.DASHSCOPE_MODEL || "qwen-plus-2025-07-28";
  if (!apiKey) return null;

  const prompt = `你是 TasteBridge 的月度总结助手。\n` +
    `请基于下面数据输出 JSON：{"insight":"...","musicSearchQuery":"歌曲名 歌手","musicReason":"..."}\n` +
    `要求：\n` +
    `1) insight 控制在 40 字以内，温暖、有总结感\n` +
    `2) 推荐一首契合氛围的歌曲（musicSearchQuery）\n` +
    `3) musicReason 说明推荐依据，20 字以内\n\n` +
    `数据：${JSON.stringify(input)}`;

  const resp = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
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
    const parsed = JSON.parse(content) as Partial<MonthlyAiPayload>;
    if (!parsed.insight || !parsed.musicSearchQuery || !parsed.musicReason) return null;
    return {
      insight: parsed.insight.trim(),
      musicSearchQuery: parsed.musicSearchQuery.trim(),
      musicReason: parsed.musicReason.trim(),
    } satisfies MonthlyAiPayload;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const headerUserId = request.headers.get("x-user-id")?.trim();
  const userId = (sp.get("userId")?.trim() || headerUserId || "").trim();

  if (!userId) {
    return NextResponse.json({ error: "userId 必填" }, { status: 400 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  try {
    const db = createSupabaseAdmin();
    const { data, error } = await db
      .from("pref_records")
      .select("overall,tags,mood_tag,created_at,spot_id")
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", nextMonthStart.toISOString())
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as PrefMonthlyRow[];
    const totalVisits = rows.length;
    const avgRating = totalVisits > 0 ? Math.round((rows.reduce((s, r) => s + r.overall, 0) / totalVisits) * 10) / 10 : 0;

    const spotIds = [...new Set(rows.map((r) => r.spot_id))];
    const nameMap = new Map<string, string>();
    if (spotIds.length > 0) {
      const spotsRes = await db.from("spots").select("id,name").in("id", spotIds);
      if (!spotsRes.error) {
        for (const s of spotsRes.data ?? []) {
          nameMap.set(s.id, s.name ?? "店铺");
        }
      }
    }

    const tagCount = new Map<string, number>();
    const moodCount = new Map<string, number>();
    const spotScore = new Map<string, { name: string; sum: number; count: number }>();

    for (const r of rows) {
      for (const t of r.tags ?? []) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
      if (r.mood_tag) moodCount.set(r.mood_tag, (moodCount.get(r.mood_tag) ?? 0) + 1);

      const key = r.spot_id;
      const cur = spotScore.get(key) ?? { name: nameMap.get(key) ?? "店铺", sum: 0, count: 0 };
      cur.sum += r.overall;
      cur.count += 1;
      spotScore.set(key, cur);
    }

    const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
    const topMoodTags = [...moodCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
    const topSpots = [...spotScore.entries()]
      .map(([id, v]) => ({ id, name: v.name, avg: Math.round((v.sum / v.count) * 10) / 10 }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3);

    const monthLabel = `${now.getMonth() + 1}月`;
    const baseInsight = totalVisits === 0
      ? `${monthLabel}还没有探店记录，去地图上点亮第一家吧。`
      : `${monthLabel}你探了${totalVisits}家店，平均喜爱值${avgRating}分。`;

    const ai = await generateMonthlyByQwen({
      totalVisits,
      avgRating,
      topTags,
      topMoodTags,
      topSpots: topSpots.map((x) => ({ name: x.name, avg: x.avg })),
    });

    const fallback = fallbackMusic(topMoodTags);

    return NextResponse.json({
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      totalVisits,
      avgRating,
      topSpots,
      topMoodTags,
      topTags,
      insight: ai?.insight ?? baseInsight,
      musicSearchQuery: ai?.musicSearchQuery ?? fallback.musicSearchQuery,
      musicReason: ai?.musicReason ?? fallback.musicReason,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
