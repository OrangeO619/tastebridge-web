/**
 * 高德「输入提示」Web 服务 API（服务端调用）
 * 文档：https://lbs.amap.com/api/webservice/guide/api/inputtips
 */

export type AmapTipRaw = {
  id?: string;
  name?: string;
  district?: string;
  adcode?: string;
  location?: string;
  address?: string;
  typecode?: string;
};

export type NormalizedTip = {
  placeId: string;
  name: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  typecode?: string;
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

export function normalizeAmapTip(t: AmapTipRaw): NormalizedTip | null {
  const pos = parseLocation(t.location);
  if (!pos || !t.name) return null;
  const placeId = t.id?.trim();
  if (!placeId) return null;
  return {
    placeId,
    name: t.name.trim(),
    district: (t.district ?? "").trim(),
    address: (t.address ?? "").trim(),
    lat: pos.lat,
    lng: pos.lng,
    typecode: t.typecode?.trim() || undefined,
  };
}

export type InputTipsParams = {
  key: string;
  keywords: string;
  city?: string;
  cityLimit?: boolean;
  /** POI 分类代码，如 "050000" 表示餐饮服务 */
  type?: string;
  /** 返回数量，默认 10，最大 30 */
  datatype?: "all" | "poi" | "bus" | "busline";
};

export type InputTipsResult =
  | { ok: true; tips: NormalizedTip[]; count: number }
  | { ok: false; message: string };

export async function amapInputTips(
  params: InputTipsParams,
): Promise<InputTipsResult> {
  const {
    key,
    keywords,
    city,
    cityLimit = false,
    type,
    datatype = "poi",
  } = params;

  const url = new URL("https://restapi.amap.com/v3/assistant/inputtips");
  url.searchParams.set("key", key);
  url.searchParams.set("keywords", keywords.trim());
  url.searchParams.set("datatype", datatype);
  if (city?.trim()) {
    url.searchParams.set("city", city.trim());
    if (cityLimit) url.searchParams.set("citylimit", "true");
  }
  if (type?.trim()) {
    url.searchParams.set("type", type.trim());
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
    tips?: AmapTipRaw[];
  };

  if (data.status !== "1") {
    const msg = data.info || data.infocode || "高德返回失败";
    return { ok: false, message: msg };
  }

  const rawList = Array.isArray(data.tips) ? data.tips : [];
  const tips: NormalizedTip[] = [];
  for (const t of rawList) {
    const n = normalizeAmapTip(t);
    if (n) tips.push(n);
  }

  const count = Number.parseInt(String(data.count ?? tips.length), 10);
  return {
    ok: true,
    tips,
    count: Number.isFinite(count) ? count : tips.length,
  };
}
