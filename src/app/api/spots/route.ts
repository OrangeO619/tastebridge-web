import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { rowToSpot } from "@/types/spot";

const postBodySchema = z.object({
  name: z.string().min(1),
  address: z.string().optional().default(""),
  lat: z.number(),
  lng: z.number(),
  placeId: z.string().optional(),
  phone: z.string().optional(),
  businessHours: z.string().optional(),
  categories: z.array(z.string()).optional().default([]),
  gaodeRating: z.string().optional(),
  avgPrice: z.string().optional(),
  createdBy: z.string().min(1),
});

// 城市边界框（简化版，用于按城市筛选）
const CITY_BOUNDS: Record<string, { minLng: number; maxLng: number; minLat: number; maxLat: number }> = {
  武汉: { minLng: 113.7, maxLng: 115.0, minLat: 29.9, maxLat: 31.3 },
  北京: { minLng: 115.4, maxLng: 117.5, minLat: 39.4, maxLat: 41.1 },
  上海: { minLng: 120.8, maxLng: 122.0, minLat: 30.7, maxLat: 31.9 },
  广州: { minLng: 112.9, maxLng: 114.0, minLat: 22.5, maxLat: 23.9 },
  深圳: { minLng: 113.7, maxLng: 114.6, minLat: 22.4, maxLat: 22.9 },
  成都: { minLng: 103.0, maxLng: 105.0, minLat: 30.0, maxLat: 31.5 },
  杭州: { minLng: 119.0, maxLng: 121.0, minLat: 29.2, maxLat: 30.6 },
  南京: { minLng: 118.2, maxLng: 119.5, minLat: 31.2, maxLat: 32.6 },
  重庆: { minLng: 105.2, maxLng: 107.0, minLat: 28.1, maxLat: 30.2 },
  西安: { minLng: 107.4, maxLng: 109.8, minLat: 33.4, maxLat: 35.0 },
  苏州: { minLng: 119.9, maxLng: 121.3, minLat: 30.8, maxLat: 32.0 },
  天津: { minLng: 116.7, maxLng: 118.1, minLat: 38.5, maxLat: 40.3 },
  长沙: { minLng: 111.9, maxLng: 114.2, minLat: 27.8, maxLat: 28.7 },
  郑州: { minLng: 112.7, maxLng: 114.2, minLat: 34.2, maxLat: 35.0 },
  青岛: { minLng: 119.3, maxLng: 121.0, minLat: 35.3, maxLat: 37.0 },
  厦门: { minLng: 117.8, maxLng: 118.5, minLat: 24.3, maxLat: 24.8 },
  大连: { minLng: 120.9, maxLng: 123.0, minLat: 38.7, maxLat: 40.0 },
  宁波: { minLng: 120.9, maxLng: 122.3, minLat: 29.0, maxLat: 30.4 },
  无锡: { minLng: 119.7, maxLng: 120.9, minLat: 31.1, maxLat: 32.0 },
  佛山: { minLng: 112.3, maxLng: 113.5, minLat: 22.4, maxLat: 23.6 },
};

function detectCity(lng: number, lat: number): string | null {
  for (const [city, bounds] of Object.entries(CITY_BOUNDS)) {
    if (lng >= bounds.minLng && lng <= bounds.maxLng && lat >= bounds.minLat && lat <= bounds.maxLat) {
      return city;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ spots: [], error: "Supabase 未配置" });

  const { searchParams } = new URL(request.url);
  const tags = searchParams.getAll("tag");
  const overallMin = searchParams.has("overallMin") ? parseFloat(searchParams.get("overallMin") ?? "0") : null;
  const overallMax = searchParams.has("overallMax") ? parseFloat(searchParams.get("overallMax") ?? "5") : null;
  const categories = searchParams.getAll("category");
  const keyword = searchParams.get("keyword")?.trim() ?? null;
  const requesterId = (searchParams.get("userId")?.trim() || request.headers.get("x-user-id")?.trim() || "").trim();
  const ownerId = searchParams.get("ownerId")?.trim() || null;
  const layer = searchParams.get("layer")?.trim() as "all" | "mine" | "shared" | null;
  const city = searchParams.get("city")?.trim() || null;
  const includeCityStats = searchParams.get("cityStats") === "1";

  try {
    const supabase = createSupabaseAdmin();
    const [spotsRes, prefsRes, mapSharesRes, invRes] = await Promise.all([
      supabase.from("spots").select("*").order("created_at", { ascending: false }),
      supabase.from("pref_records").select("spot_id, overall, tags"),
      requesterId ? supabase.from("map_shares").select("owner_id,shared_with,permission").or(`owner_id.eq.${requesterId},shared_with.eq.${requesterId}`) : Promise.resolve({ data: [], error: null }),
      requesterId ? supabase.from("collab_invites").select("spot_id,inviter_id,invitee_id,status").eq("status", "accepted").or(`inviter_id.eq.${requesterId},invitee_id.eq.${requesterId}`) : Promise.resolve({ data: [], error: null }),
    ]);
    if (spotsRes.error) return NextResponse.json({ spots: [], error: spotsRes.error.message }, { status: 500 });

    const aggMap = new Map<string, { sum: number; count: number; allTags: Set<string> }>();
    for (const r of prefsRes.data ?? []) {
      const cur = aggMap.get(r.spot_id) ?? { sum: 0, count: 0, allTags: new Set<string>() };
      cur.sum += r.overall;
      cur.count += 1;
      if (Array.isArray(r.tags)) r.tags.forEach((t: string) => cur.allTags.add(t));
      aggMap.set(r.spot_id, cur);
    }

    const editableOwnerIds = new Set<string>();
    const visibleOwnerIds = new Set<string>();
    for (const row of mapSharesRes.data ?? []) {
      if (row.shared_with === requesterId) visibleOwnerIds.add(row.owner_id);
      if (row.shared_with === requesterId && row.permission === "edit") editableOwnerIds.add(row.owner_id);
      if (row.owner_id === requesterId) visibleOwnerIds.add(row.owner_id);
    }

    const accessibleSpotIds = new Set<string>();
    for (const row of invRes.data ?? []) {
      if (row.inviter_id === requesterId || row.invitee_id === requesterId) accessibleSpotIds.add(row.spot_id);
    }

    let spots = (spotsRes.data ?? [])
      .filter((row) => {
        if (!requesterId) return !ownerId && !layer;
        
        // 按图层模式筛选
        if (layer === "mine") {
          // 仅显示我创建的点位
          return row.created_by === requesterId;
        }
        if (layer === "shared") {
          // 仅显示共享给我的点位（不包括我自己的）
          if (ownerId) {
            // 指定了具体的共享者
            return row.created_by === ownerId && ownerId !== requesterId && visibleOwnerIds.has(ownerId);
          }
          // 显示所有共享给我的点位
          return row.created_by !== requesterId && visibleOwnerIds.has(row.created_by);
        }
        
        // layer === "all" 或未指定：显示全部可见点位
        if (ownerId) {
          return row.created_by === ownerId && (ownerId === requesterId || visibleOwnerIds.has(ownerId));
        }
        return row.created_by === requesterId || visibleOwnerIds.has(row.created_by) || accessibleSpotIds.has(row.id);
      })
      .map((row) => {
        const spot = rowToSpot(row);
        const agg = aggMap.get(row.id);
        if (agg && agg.count > 0) {
          spot.avgOverall = Math.round((agg.sum / agg.count) * 10) / 10;
          spot.prefCount = agg.count;
        }
        return spot;
      });

    // 计算城市统计（在城市筛选之前）
    let cityStats: Array<{ name: string; spotCount: number }> = [];
    if (includeCityStats) {
      const cityCountMap = new Map<string, number>();
      for (const spot of spots) {
        const detectedCity = detectCity(spot.location.lng, spot.location.lat);
        if (detectedCity) {
          cityCountMap.set(detectedCity, (cityCountMap.get(detectedCity) ?? 0) + 1);
        }
      }
      cityStats = Array.from(cityCountMap.entries())
        .map(([name, spotCount]) => ({ name, spotCount }))
        .sort((a, b) => b.spotCount - a.spotCount);
    }

    // 按城市筛选
    if (city) {
      const bounds = CITY_BOUNDS[city];
      if (bounds) {
        spots = spots.filter((spot) =>
          spot.location.lng >= bounds.minLng &&
          spot.location.lng <= bounds.maxLng &&
          spot.location.lat >= bounds.minLat &&
          spot.location.lat <= bounds.maxLat
        );
      }
    }

    if (tags.length > 0 || overallMin !== null || overallMax !== null || categories.length > 0 || keyword) {
      spots = spots
        .map((spot) => {
          const agg = aggMap.get(spot.id);
          const spotTags = agg?.allTags ?? new Set<string>();
          const spotAvg = spot.avgOverall ?? 0;
          const spotCats = spot.categories ?? [];
          const reasons: string[] = [];

          if (tags.length > 0) {
            const hitTags = tags.filter((t) => spotTags.has(t));
            if (hitTags.length === 0) return null;
            reasons.push(`标签命中: ${hitTags.join("、")}`);
          }

          if (overallMin !== null) {
            if (spotAvg < overallMin) return null;
            reasons.push(`评分≥${overallMin}`);
          }
          if (overallMax !== null) {
            if (spotAvg > overallMax) return null;
            reasons.push(`评分≤${overallMax}`);
          }

          if (categories.length > 0) {
            const hitCats = categories.filter((x) => spotCats.includes(x));
            if (hitCats.length === 0) return null;
            reasons.push(`分类命中: ${hitCats.join("、")}`);
          }

          if (keyword) {
            const inName = spot.name.includes(keyword);
            const inAddr = spot.address.includes(keyword);
            if (!inName && !inAddr) return null;
            reasons.push(inName ? `关键词命中店名: ${keyword}` : `关键词命中地址: ${keyword}`);
          }

          return { ...spot, matchedReasons: reasons };
        })
        .filter((s) => s !== null)
        .sort((a, b) => {
          const ra = a.matchedReasons?.length ?? 0;
          const rb = b.matchedReasons?.length ?? 0;
          if (rb !== ra) return rb - ra;
          return (b.avgOverall ?? 0) - (a.avgOverall ?? 0);
        });
    }

    return NextResponse.json({ spots, cityStats, permissions: { editableOwnerIds: [...editableOwnerIds], visibleOwnerIds: [...visibleOwnerIds] } });
  } catch (e) {
    return NextResponse.json({ spots: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase 未配置" }, { status: 503 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "非法 JSON" }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const b = parsed.data;

  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("spots")
      .insert({
        name: b.name,
        address: b.address,
        lat: b.lat,
        lng: b.lng,
        place_id: b.placeId ?? null,
        phone: b.phone ?? null,
        business_hours: b.businessHours ?? null,
        categories: b.categories,
        gaode_rating: b.gaodeRating ?? null,
        avg_price: b.avgPrice ?? null,
        created_by: b.createdBy,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ spot: rowToSpot(data) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
