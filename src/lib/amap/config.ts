/**
 * 高德开放平台 → 应用管理 → 添加「Web端(JS API)」Key
 * 2021-12-02 之后申请的 Key 通常还需配置安全密钥（同控制台）
 *
 * 坐标：高德地图使用 GCJ-02。库内存储的 lat/lng 请统一按此坐标系，
 * 若历史数据来自 Mapbox(WGS84)，写入前需转换（可用 coordtransform）。
 */

export function getAmapWebKey(): string | undefined {
  return process.env.NEXT_PUBLIC_AMAP_KEY;
}

/** 可选；有「安全密钥」时必须在 load AMap 脚本前设置 _AMapSecurityConfig */
export function getAmapSecurityJsCode(): string | undefined {
  return process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE;
}

/**
 * 高德 **Web 服务** Key（关键字搜索、路径规划等），仅服务端使用，勿加 NEXT_PUBLIC_
 * 控制台 → 应用 → 添加「Web服务」类型 Key（可与 JS API Key 不同）
 */
export function getAmapWebServiceKey(): string | undefined {
  return (
    process.env.AMAP_WEB_SERVICE_KEY?.trim() ||
    process.env.AMAP_REST_KEY?.trim()
  );
}
