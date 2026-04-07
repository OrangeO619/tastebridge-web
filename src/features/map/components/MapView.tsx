"use client";

import { useEffect, useRef, useState } from "react";
import {
  getAmapSecurityJsCode,
  getAmapWebKey,
} from "@/lib/amap/config";
import type { Spot } from "@/types/spot";

/** 上海 [lng, lat] */
const DEFAULT_CENTER: [number, number] = [121.4737, 31.2304];

type MapViewProps = {
  spots?: Spot[];
  /** 当前选中的点位，用于高亮标记 */
  selectedSpotId?: string | null;
  /** 点击标记选中；点击空白地图传 null */
  onSpotSelect?: (spot: Spot | null) => void;
  className?: string;
};

/**
 * 按平均喜爱值返回标记填充色与光晕色。
 * 无记录 → 琥珀；≥4.5 → 红；≥3.5 → 橙；≥2.5 → 黄；<2.5 → 灰
 */
function scoreColor(avg: number | undefined): { fill: string; glow: string } {
  if (!avg) return { fill: "#f59e0b", glow: "rgba(245,158,11,0.45)" };
  if (avg >= 4.5) return { fill: "#ef4444", glow: "rgba(239,68,68,0.45)" };
  if (avg >= 3.5) return { fill: "#f97316", glow: "rgba(249,115,22,0.45)" };
  if (avg >= 2.5) return { fill: "#eab308", glow: "rgba(234,179,8,0.45)" };
  return { fill: "#94a3b8", glow: "rgba(148,163,184,0.45)" };
}

/** 按平均喜爱值返回基础直径 (px)：分越高点越大 */
function scoreSize(avg: number | undefined): number {
  if (!avg) return 13;
  if (avg >= 4.5) return 17;
  if (avg >= 3.5) return 15;
  if (avg >= 2.5) return 13;
  return 11;
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
  el.style.transition = "transform 0.15s ease";
  if (selected) {
    el.style.outline = `2px solid ${fill}`;
    el.style.outlineOffset = "1px";
  }
  el.title = title;
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

export function MapView({
  spots = [],
  selectedSpotId = null,
  onSpotSelect,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const onSpotSelectRef = useRef(onSpotSelect);
  const ignoreNextMapClickRef = useRef(false);
  const lastFitSignatureRef = useRef<string>("");
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  onSpotSelectRef.current = onSpotSelect;

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
          zoom: 12,
          center: DEFAULT_CENTER,
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
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
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
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
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
    }
    const sig = spotsGeometrySignature(spots);
    if (
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
    };
  }, [mapReady, spots, selectedSpotId]);

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
}
