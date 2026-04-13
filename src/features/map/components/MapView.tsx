"use client";

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  getAmapSecurityJsCode,
  getAmapWebKey,
} from "@/lib/amap/config";
import type { Spot } from "@/types/spot";

/** 武汉 [lng, lat] */
const DEFAULT_CENTER: [number, number] = [114.3054, 30.5931];
const DEFAULT_ZOOM = 12;

export type MapViewHandle = {
  flyTo: (center: [number, number], zoom?: number) => void;
};

type MapViewProps = {
  spots?: Spot[];
  /** 当前选中的点位，用于高亮标记 */
  selectedSpotId?: string | null;
  /** 点击标记选中；点击空白地图传 null */
  onSpotSelect?: (spot: Spot | null) => void;
  /** 减少动效模式 */
  reduceMotion?: boolean;
  /** 初始中心点 */
  initialCenter?: [number, number];
  /** 初始缩放级别 */
  initialZoom?: number;
  /** 跳过自动适配视野 */
  skipFitView?: boolean;
  className?: string;
};

/**
 * 按平均喜爱值返回标记填充色与光晕色。
 * 无记录 → 琥珀；≥4.5 → 红；≥3.5 → 橙；≥2.5 → 黄；<2.5 → 灰
 */
function scoreColor(avg: number | undefined): { fill: string; glow: string } {
  if (!avg) return { fill: "#94a3b8", glow: "rgba(245,158,11,0.45)" };
  if (avg >= 4.5) return { fill: "#ef4444", glow: "rgba(239,68,68,0.45)" };
  if (avg >= 3.5) return { fill: "#f97316", glow: "rgba(249,115,22,0.45)" };
  if (avg >= 2.5) return { fill: "#eab308", glow: "rgba(234,179,8,0.45)" };
  return { fill: "#a855f7", glow: "rgba(148,163,184,0.45)" };
}

/** 按平均喜爱值返回基础直径 (px)：分越高点越大 */
function scoreSize(avg: number | undefined): number {
  if (!avg) return 13;
  if (avg >= 4.5) return 17;
  if (avg >= 3.5) return 15;
  if (avg >= 2.5) return 13;
  return 11;
}

/** 按平均喜爱值返回动效 CSS 类名 */
function scoreAnimationClass(avg: number | undefined): string {
  if (!avg) return "spot-marker-unrated";
  if (avg >= 4.5) return "spot-marker-must-go";
  if (avg >= 3.5) return "spot-marker-good";
  if (avg >= 2.5) return "spot-marker-average";
  return "spot-marker-bad";
}

/** 高德 Marker content 用纯 style，Tailwind 类在 createElement 上常不生效 */
function createMarkerElement(
  selected: boolean,
  title: string,
  avgOverall?: number,
): HTMLDivElement {
  const el = document.createElement("div");
  const base = scoreSize(avgOverall);
  const size = selected ? base + 4 : base;
  const { fill, glow } = scoreColor(avgOverall);
  
  // 基础样式
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "50%";
  el.style.background = selected ? "#ea580c" : fill;
  el.style.border = selected ? "3px solid #ffffff" : "2px solid #ffffff";
  el.style.boxShadow = selected
    ? `0 0 0 3px white, 0 2px 8px ${glow}`
    : `0 2px 6px ${glow}`;
  el.style.cursor = "pointer";
  el.style.pointerEvents = "auto";
  el.style.boxSizing = "border-box";
  el.style.position = "relative";
  
  // 添加动效类
  const animClass = scoreAnimationClass(avgOverall);
  el.classList.add(animClass);
  if (selected) {
    el.classList.add("spot-marker-selected");
  }
  
  if (selected) {
    el.style.outline = `2px solid ${fill}`;
    el.style.outlineOffset = "1px";
  }
  el.title = title;
  
  // 存储 spotId 用于离屏检测
  el.dataset.spotMarker = "true";
  
  return el;
}

function spotsGeometrySignature(spots: Spot[]): string {
  return JSON.stringify(
    spots.map((s) => ({
      id: s.id,
      lat: s.location.lat,
      lng: s.location.lng,
    })),
  );
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView({
  spots = [],
  selectedSpotId = null,
  onSpotSelect,
  reduceMotion = false,
  initialCenter,
  initialZoom,
  skipFitView = false,
  className,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const markerElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const onSpotSelectRef = useRef(onSpotSelect);
  const ignoreNextMapClickRef = useRef(false);
  const lastFitSignatureRef = useRef<string>("");
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  onSpotSelectRef.current = onSpotSelect;

  // 暴露 flyTo 方法给父组件
  useImperativeHandle(ref, () => ({
    flyTo: (center: [number, number], zoom?: number) => {
      if (mapRef.current) {
        mapRef.current.setZoomAndCenter(zoom ?? initialZoom ?? DEFAULT_ZOOM, center, false, 500);
      }
    },
  }), [initialZoom]);

  // 离屏检测：暂停不可见点位的动画
  const setupIntersectionObserver = useCallback(() => {
    if (intersectionObserverRef.current) {
      intersectionObserverRef.current.disconnect();
    }
    
    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            el.classList.remove("offscreen");
          } else {
            el.classList.add("offscreen");
          }
        });
      },
      { rootMargin: "50px", threshold: 0 }
    );
    
    // 观察所有标记元素
    markerElementsRef.current.forEach((el) => {
      intersectionObserverRef.current?.observe(el);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let mapClickHandler: (() => void) | undefined;

    (async () => {
      const key = getAmapWebKey();
      if (!key) {
        setError(
          "请在 .env.local 中配置 NEXT_PUBLIC_AMAP_KEY（高德 Web 端 JS API Key）",
        );
        return;
      }
      if (!containerRef.current) return;

      const sec = getAmapSecurityJsCode();
      if (sec) {
        window._AMapSecurityConfig = { securityJsCode: sec };
      }

      try {
        const { default: AMapLoader } = await import("@amap/amap-jsapi-loader");
        const AMap = await AMapLoader.load({ key, version: "2.0" });
        if (cancelled || !containerRef.current) return;

        const map = new AMap.Map(containerRef.current, {
          zoom: initialZoom ?? DEFAULT_ZOOM,
          center: initialCenter ?? DEFAULT_CENTER,
          viewMode: "2D",
        });

        mapClickHandler = () => {
          if (ignoreNextMapClickRef.current) {
            ignoreNextMapClickRef.current = false;
            return;
          }
          onSpotSelectRef.current?.(null);
        };
        map.on("click", mapClickHandler);

        AMapRef.current = AMap;
        mapRef.current = map;
        setMapReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? `高德地图加载失败：${e.message}`
              : "高德地图加载失败",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
        intersectionObserverRef.current = null;
      }
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      markerElementsRef.current.clear();
      lastFitSignatureRef.current = "";
      if (mapRef.current) {
        if (mapClickHandler) {
          try {
            mapRef.current.off("click", mapClickHandler);
          } catch {}
        }
        mapRef.current.destroy();
        mapRef.current = null;
      }
      AMapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !AMapRef.current) return;
    const AMap = AMapRef.current;
    const map = mapRef.current;
    if (spots.length === 0) lastFitSignatureRef.current = "";
    
    // 清理旧标记
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    markerElementsRef.current.clear();
    
    for (const spot of spots) {
      const selected = spot.id === selectedSpotId;
      const content = createMarkerElement(selected, spot.name, spot.avgOverall);
      const base = scoreSize(spot.avgOverall);
      const h = Math.round((selected ? base + 4 : base) / 2);
      const marker = new AMap.Marker({
        position: [spot.location.lng, spot.location.lat],
        content,
        offset: new AMap.Pixel(-h, -h),
        title: spot.name,
        map,
        zIndex: selected ? 130 : 120,
      });
      marker.on("click", (e: { stopPropagation?: () => void; domEvent?: { stopPropagation?: () => void } }) => {
        e?.stopPropagation?.();
        e?.domEvent?.stopPropagation?.();
        onSpotSelectRef.current?.(spot);
      });
      markersRef.current.push(marker);
      markerElementsRef.current.set(spot.id, content);
    }
    
    // 设置离屏检测
    setupIntersectionObserver();
    
    const sig = spotsGeometrySignature(spots);
    // 只有在不跳过自动适配视野时才执行 setFitView
    if (
      !skipFitView &&
      spots.length > 0 &&
      sig !== lastFitSignatureRef.current &&
      typeof map.setFitView === "function"
    ) {
      lastFitSignatureRef.current = sig;
      try {
        map.setFitView(markersRef.current, false, [56, 48, 200, 48]);
      } catch {
        const f = spots[0];
        map.setZoomAndCenter(14, [f.location.lng, f.location.lat]);
      }
    }
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      markerElementsRef.current.clear();
    };
  }, [mapReady, spots, selectedSpotId, setupIntersectionObserver, skipFitView]);

  // 减少动效模式切换
  useEffect(() => {
    if (containerRef.current) {
      if (reduceMotion) {
        containerRef.current.classList.add("reduce-motion");
      } else {
        containerRef.current.classList.remove("reduce-motion");
      }
    }
  }, [reduceMotion]);

  if (error) {
    return (
      <div
        className={
          className ??
          "flex h-full w-full items-center justify-center bg-zinc-100 p-4 text-center text-sm text-zinc-600"
        }
      >
        {error}
      </div>
    );
  }
  return <div ref={containerRef} className={className ?? "h-full min-h-[50vh] w-full"} />;
});
