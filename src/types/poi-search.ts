/** 与 /api/poi/search、/api/poi/detail 返回的 poi 结构一致 */
export type PoiSearchItem = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  /** 品类链，如「餐饮服务;中餐厅;火锅店」 */
  typeName?: string;
  typecode?: string;
  businessHours?: string;
  /** 高德评分 */
  rating?: string;
  /** 人均展示，如「约 ¥88/人」 */
  avgPrice?: string;
  poiTags?: string[];
};
