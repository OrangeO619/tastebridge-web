/**
 * 从高德 POI 原始对象中抽取营业时间、评分、人均、标签等（兼容字段名差异）
 */

export type PoiExtraFields = {
  businessHours?: string;
  rating?: string;
  /** 展示用，如「约 ¥88/人」 */
  avgPrice?: string;
  /** 高德 tag 拆分，如「无烟区、可订座」 */
  poiTags?: string[];
};

export function asRecord(x: unknown): Record<string, unknown> | null {
  if (x && typeof x === "object" && !Array.isArray(x)) {
    return x as Record<string, unknown>;
  }
  return null;
}

function pickStr(o: Record<string, unknown>, k: string): string | undefined {
  const v = o[k];
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

/** 人均：biz_ext.cost 常为数字字符串 */
export function formatAvgPriceFromCost(cost: string | undefined): string | undefined {
  if (!cost?.trim()) return undefined;
  const n = Number.parseFloat(cost.replace(/[^\d.]/g, ""));
  if (Number.isFinite(n) && n > 0) {
    return `约 ¥${Math.round(n)}/人`;
  }
  return cost.trim();
}

/** 解析 biz_ext（有时为 JSON 字符串） */
function parseBizExt(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw) as unknown;
      return asRecord(j);
    } catch {
      return null;
    }
  }
  return asRecord(raw);
}

/** 高德 tag 多为英文逗号或中文逗号分隔 */
export function splitAmapTags(tag: string | undefined): string[] {
  if (!tag?.trim()) return [];
  return tag
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/**
 * 从 place/text 或 place/detail 单条 POI 抽取扩展字段
 */
export function extractPoiExtraFields(raw: unknown): PoiExtraFields {
  const o = asRecord(raw);
  if (!o) return {};

  const biz = parseBizExt(o.biz_ext);
  const rating = biz ? pickStr(biz, "rating") : undefined;
  const costRaw = biz ? pickStr(biz, "cost") : undefined;
  const avgPrice = formatAvgPriceFromCost(costRaw);

  const opentime =
    pickStr(o, "opentime_week") ||
    pickStr(o, "opentime_today") ||
    pickStr(o, "opentime") ||
    pickStr(o, "open_time");

  const poiTags = splitAmapTags(pickStr(o, "tag"));

  return {
    businessHours: opentime,
    rating,
    avgPrice,
    poiTags: poiTags.length ? poiTags : undefined,
  };
}
