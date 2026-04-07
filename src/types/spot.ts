/** 与 PRD 对齐的店铺点位（前端/API 共用） */
export type Spot = {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  placeId?: string;
  phone?: string;
  businessHours?: string;
  categories: string[];
  /** 高德评分快照（非用户喜爱值） */
  gaodeRating?: string;
  /** 高德人均展示，如「约 ¥88/人」 */
  avgPrice?: string;
  /** 该店所有 pref_records 的平均 overall（聚合字段） */
  avgOverall?: number;
  /** 该店的喜爱记录人数 */
  prefCount?: number;
  /** 当前搜索条件下的命中原因（仅搜索时返回） */
  matchedReasons?: string[];
  createdAt: string;
  createdBy: string;
};

export type SpotRow = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  place_id: string | null;
  phone: string | null;
  business_hours: string | null;
  categories: string[] | null;
  gaode_rating: string | null;
  avg_price: string | null;
  created_at: string;
  created_by: string;
};

export function rowToSpot(row: SpotRow): Spot {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    location: { lat: row.lat, lng: row.lng },
    placeId: row.place_id ?? undefined,
    phone: row.phone ?? undefined,
    businessHours: row.business_hours ?? undefined,
    categories: row.categories ?? [],
    gaodeRating: row.gaode_rating ?? undefined,
    avgPrice: row.avg_price ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}
