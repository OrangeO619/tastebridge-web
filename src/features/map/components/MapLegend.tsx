"use client";

import { useState, useEffect } from "react";
import { Sparkles, ZapOff } from "lucide-react";

const LEGEND = [
  { color: "#ef4444", label: "必去", desc: "≥4.5分" },
  { color: "#f97316", label: "还行", desc: "≥3.5分" },
  { color: "#eab308", label: "一般", desc: "≥2.5分" },
  { color: "#94a3b8", label: "踩雷", desc: "<2.5分" },
  { color: "#f59e0b", label: "未评", desc: "无评分" },
];

type MapLegendProps = {
  reduceMotion?: boolean;
  onReduceMotionChange?: (value: boolean) => void;
};

export function MapLegend({ reduceMotion = false, onReduceMotionChange }: MapLegendProps) {
  const [localReduceMotion, setLocalReduceMotion] = useState(reduceMotion);

  useEffect(() => {
    // 读取本地存储的偏好
    const stored = window.localStorage.getItem("tb_reduce_motion");
    if (stored !== null) {
      const value = stored === "1";
      setLocalReduceMotion(value);
      onReduceMotionChange?.(value);
    }
  }, [onReduceMotionChange]);

  const toggleReduceMotion = () => {
    const next = !localReduceMotion;
    setLocalReduceMotion(next);
    window.localStorage.setItem("tb_reduce_motion", next ? "1" : "0");
    onReduceMotionChange?.(next);
  };

  return (
    <div
      className="pointer-events-auto absolute bottom-4 right-3 z-20 flex flex-col gap-1.5 rounded-xl bg-black/50 px-2.5 py-2 backdrop-blur-sm"
    >
      {/* 图例项 */}
      {LEGEND.map(({ color, label, desc }) => (
        <div key={label} className="flex items-center gap-2">
          <span
            style={{ background: color }}
            className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
          />
          <span className="text-[10px] leading-none text-white/85">{label}</span>
          <span className="text-[9px] leading-none text-white/50">{desc}</span>
        </div>
      ))}
      
      {/* 减少动效开关 */}
      <div className="mt-1 border-t border-white/10 pt-1.5">
        <button
          onClick={toggleReduceMotion}
          className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-[10px] text-white/70 transition hover:bg-white/10"
        >
          {localReduceMotion ? (
            <>
              <ZapOff className="h-3 w-3" />
              <span>动效已关闭</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              <span>减少动效</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
