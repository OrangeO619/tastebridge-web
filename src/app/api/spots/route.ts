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
        if (!requesterId) return !ownerId;
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

    return NextResponse.json({ spots, permissions: { editableOwnerIds: [...editableOwnerIds], visibleOwnerIds: [...visibleOwnerIds] } });
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
