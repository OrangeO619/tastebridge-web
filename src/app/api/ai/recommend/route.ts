import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const querySchema = z.object({
  spotId: z.string().uuid(),
  userId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(6).optional().default(3),
});

type SpotLite = {
  id: string;
  name: string;
  address: string;
  categories: string[] | null;
};

type PrefLite = {
  spot_id: string;
  overall: number;
  tags: string[] | null;
  user_id: string;
};

type RankedItem = {
  id: string;
  name: string;
  address: string;
  categories: string[];
  matchScore: number;
  reason: string;
};

async function refineReasonsByQwen(targetName: string, items: RankedItem[]) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const model = process.env.DASHSCOPE_MODEL || "qwen-plus-2025-07-28";
  if (!apiKey || items.length === 0) return null;

  const prompt = `你是 TasteBridge 的相似店铺推荐助手。\n` +
    `目标店铺：${targetName}\n` +
    `请为候选店铺生成更自然的一句话推荐理由，输出 JSON：{"items":[{"id":"...","reason":"..."}]}\n` +
    `要求：每条理由 20 字以内，具体、有场景感，不要空话。\n` +
    `候选：${JSON.stringify(items.map((x) => ({ id: x.id, name: x.name, categories: x.categories, baseReason: x.reason, score: x.matchScore })))} `;

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
    const parsed = JSON.parse(content) as { items?: Array<{ id?: string; reason?: string }> };
    const map = new Map<string, string>();
    for (const it of parsed.items ?? []) {
      if (it.id && it.reason) map.set(it.id, it.reason.trim());
    }
    return map;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    spotId: sp.get("spotId"),
    userId: sp.get("userId") ?? undefined,
    limit: sp.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ items: [], error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { spotId, userId, limit } = parsed.data;

  try {
    const db = createSupabaseAdmin();

    const [spotsRes, prefsRes] = await Promise.all([
      db.from("spots").select("id,name,address,categories"),
      db.from("pref_records").select("spot_id,overall,tags,user_id"),
    ]);

    if (spotsRes.error) return NextResponse.json({ items: [], error: spotsRes.error.message }, { status: 500 });
    if (prefsRes.error) return NextResponse.json({ items: [], error: prefsRes.error.message }, { status: 500 });

    const spots = (spotsRes.data ?? []) as SpotLite[];
    const prefs = (prefsRes.data ?? []) as PrefLite[];

    const target = spots.find((s) => s.id === spotId);
    if (!target) return NextResponse.json({ items: [], error: "店铺不存在" }, { status: 404 });

    const targetCats = new Set(target.categories ?? []);

    const tagAgg = new Map<string, Set<string>>();
    const scoreAgg = new Map<string, { sum: number; count: number }>();
    const userTagPref = new Set<string>();

    for (const p of prefs) {
      const tags = p.tags ?? [];
      if (!tagAgg.has(p.spot_id)) tagAgg.set(p.spot_id, new Set());
      const set = tagAgg.get(p.spot_id)!;
      for (const t of tags) set.add(t);

      const s = scoreAgg.get(p.spot_id) ?? { sum: 0, count: 0 };
      s.sum += p.overall;
      s.count += 1;
      scoreAgg.set(p.spot_id, s);

      if (userId && p.user_id === userId) {
        for (const t of tags) userTagPref.add(t);
      }
    }

    const targetTags = tagAgg.get(spotId) ?? new Set<string>();

    let ranked: RankedItem[] = spots
      .filter((s) => s.id !== spotId)
      .map((s) => {
        const cats = new Set(s.categories ?? []);
        const tags = tagAgg.get(s.id) ?? new Set<string>();
        const agg = scoreAgg.get(s.id);
        const avgOverall = agg && agg.count > 0 ? agg.sum / agg.count : 0;

        const catHits = [...cats].filter((c) => targetCats.has(c));
        const tagHits = [...tags].filter((t) => targetTags.has(t));
        const userHits = [...tags].filter((t) => userTagPref.has(t));

        const matchScore =
          catHits.length * 2.2 +
          tagHits.length * 1.5 +
          userHits.length * 1.1 +
          avgOverall * 0.35;

        const reasonParts = [
          catHits.length ? `同类: ${catHits.slice(0, 2).join("、")}` : "",
          tagHits.length ? `标签相似: ${tagHits.slice(0, 2).join("、")}` : "",
          userHits.length ? `符合你偏好: ${userHits.slice(0, 2).join("、")}` : "",
        ].filter(Boolean);

        return {
          id: s.id,
          name: s.name,
          address: s.address,
          categories: s.categories ?? [],
          matchScore: Math.round(matchScore * 100) / 100,
          reason: reasonParts.join(" · ") || "综合口味与标签相近",
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    const refined = await refineReasonsByQwen(target.name, ranked);
    if (refined) {
      ranked = ranked.map((x) => ({ ...x, reason: refined.get(x.id) ?? x.reason }));
    }

    return NextResponse.json({ items: ranked });
  } catch (e) {
    return NextResponse.json({ items: [], error: String(e) }, { status: 500 });
  }
}
