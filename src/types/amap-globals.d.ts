/**
 * 高德 JS API 由 @amap/amap-jsapi-loader 动态注入，此处仅做最小类型声明。
 */
declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

export {};
