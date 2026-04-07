/**
 * 高德「关键字搜索」Web 服务 API（服务端调用）
 * 文档：https://lbs.amap.com/api/webservice/guide/api/search
 */

import { extractPoiExtraFields } from "@/lib/amap/poi-fields";

export type AmapPoiRaw = {
  id?: string;
  name?: string;
  type?: string;
  typecode?: string;
  address?: string;
  location?: string;
  tel?: string;
  distance?: string;
  biz_ext?: unknown;
  tag?: string;
  opentime_week?: string;
  opentime_today?: string;
  opentime?: string;
  open_time?: string;
};

/** 关键字搜索结果（含部分扩展字段；完整评分/人均/营业时间以 place/detail 为准） */
export type NormalizedPoi = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  /** 高德 type，如「餐饮服务;中餐厅;火锅店」——即品类/业态 */
  typeName?: string;
  typecode?: string;
  businessHours?: string;
  rating?: string;
  avgPrice?: string;
  poiTags?: string[];
};

function parseLocation(loc: string | undefined): { lng: number; lat: number } | null {
  if (!loc || typeof loc !== "string") return null;
  const parts = loc.split(",");
  if (parts.length < 2) return null;
  const lng = Number(parts[0]?.trim());
  const lat = Number(parts[1]?.trim());
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

function normalizeTel(tel: string | undefined): string | undefined {
  if (!tel || !tel.trim()) return undefined;
  const first = tel.split(";")[0]?.trim();
  return first || undefined;
}

export function normalizeAmapPoi(p: AmapPoiRaw): NormalizedPoi | null {
  const pos = parseLocation(p.location);
  if (!pos || !p.name) return null;
  const placeId = p.id?.trim();
  if (!placeId) return null;
  const extra = extractPoiExtraFields(p as unknown);
  return {
    placeId,
    name: p.name.trim(),
    address: (p.address ?? "").trim(),
    lat: pos.lat,
    lng: pos.lng,
    phone: normalizeTel(p.tel),
    typeName: p.type?.trim() || undefined,
    typecode: p.typecode?.trim() || undefined,
    ...extra,
  };
}

export type PlaceTextSearchParams = {
  key: string;
  keywords: string;
  city?: string;
  /** 每页条数，最大 25 */
  offset?: number;
  page?: number;
  cityLimit?: boolean;
};

export type PlaceTextSearchResult =
  | { ok: true; pois: NormalizedPoi[]; count: number }
  | { ok: false; message: string };

export async function amapPlaceTextSearch(
  params: PlaceTextSearchParams,
): Promise<PlaceTextSearchResult> {
  const {
    key,
    keywords,
    city,
    offset = 15,
    page = 1,
    cityLimit = false,
  } = params;

  const url = new URL("https://restapi.amap.com/v3/place/text");
  url.searchParams.set("key", key);
  url.searchParams.set("keywords", keywords.trim());
  url.searchParams.set("offset", String(Math.min(25, Math.max(1, offset))));
  url.searchParams.set("page", String(Math.max(1, page)));
  url.searchParams.set("extensions", "all");
  if (city?.trim()) {
    url.searchParams.set("city", city.trim());
    if (cityLimit) url.searchParams.set("citylimit", "true");
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return { ok: false, message: `高德请求失败 HTTP ${res.status}` };
  }

  const data = (await res.json()) as {
    status?: string;
    info?: string;
    infocode?: string;
    count?: string;
    pois?: AmapPoiRaw[];
  };

  if (data.status !== "1") {
    const msg = data.info || data.infocode || "高德返回失败";
    return { ok: false, message: msg };
  }

  const rawList = Array.isArray(data.pois) ? data.pois : [];
  const pois: NormalizedPoi[] = [];
  for (const p of rawList) {
    const n = normalizeAmapPoi(p);
    if (n) pois.push(n);
  }

  const count = Number.parseInt(String(data.count ?? pois.length), 10);
  return {
    ok: true,
    pois,
    count: Number.isFinite(count) ? count : pois.length,
  };
}
