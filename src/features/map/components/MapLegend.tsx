"use client";

const LEGEND = [
  { color: "#ef4444", label: "\u5fc5\u53bb" },
  { color: "#f97316", label: "\u8fd8\u884c" },
  { color: "#eab308", label: "\u4e00\u822c" },
  { color: "#94a3b8", label: "\u8e29\u96f7" },
  { color: "#f59e0b", label: "\u672a\u8bc4" },
];

export function MapLegend() {
  return (
    <div
      className="pointer-events-none absolute bottom-4 right-3 z-20 flex flex-col gap-1 rounded-xl bg-black/50 px-2.5 py-2 backdrop-blur-sm"
    >
      {LEGEND.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span
            style={{ background: color }}
            className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
          />
          <span className="text-[10px] leading-none text-white/85">{label}</span>
        </div>
      ))}
    </div>
  );
}
