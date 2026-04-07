/**
 * 高德「POI 详情」Web 服务 v3/place/detail
 * 营业时间、biz_ext（评分、人均）等以详情接口为准
 */

import { extractPoiExtraFields } from "@/lib/amap/poi-fields";
import {
  normalizeAmapPoi,
  type AmapPoiRaw,
  type NormalizedPoi,
} from "@/lib/amap/place-text-search";

export type PlaceDetailResult =
  | { ok: true; poi: NormalizedPoi }
  | { ok: false; message: string };

export async function amapPlaceDetail(
  key: string,
  placeId: string,
): Promise<PlaceDetailResult> {
  const id = placeId.trim();
  if (!id) {
    return { ok: false, message: "缺少 POI id" };
  }

  const url = new URL("https://restapi.amap.com/v3/place/detail");
  url.searchParams.set("key", key);
  url.searchParams.set("id", id);
  url.searchParams.set("extensions", "all");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return { ok: false, message: `高德详情请求失败 HTTP ${res.status}` };
  }

  const data = (await res.json()) as {
    status?: string;
    info?: string;
    infocode?: string;
    pois?: AmapPoiRaw[];
  };

  if (data.status !== "1") {
    return {
      ok: false,
      message: data.info || data.infocode || "高德详情返回失败",
    };
  }

  const raw = Array.isArray(data.pois) ? data.pois[0] : undefined;
  if (!raw) {
    return { ok: false, message: "未找到该 POI 详情" };
  }

  const base = normalizeAmapPoi(raw);
  if (!base) {
    return { ok: false, message: "详情数据无法解析" };
  }

  const extra = extractPoiExtraFields(raw as unknown);
  return { ok: true, poi: { ...base, ...extra } };
}
