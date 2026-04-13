"use client";

import { ChevronDown, Loader2, MapPin, Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

// 预设城市及其中心坐标
const PRESET_CITIES: Record<string, { center: [number, number]; zoom: number }> = {
  武汉: { center: [114.3054, 30.5931], zoom: 12 },
  北京: { center: [116.4074, 39.9042], zoom: 11 },
  上海: { center: [121.4737, 31.2304], zoom: 11 },
  广州: { center: [113.2644, 23.1291], zoom: 11 },
  深圳: { center: [114.0579, 22.5431], zoom: 11 },
  成都: { center: [104.0668, 30.5728], zoom: 11 },
  杭州: { center: [120.1551, 30.2741], zoom: 11 },
  南京: { center: [118.7969, 32.0603], zoom: 11 },
  重庆: { center: [106.5516, 29.5630], zoom: 11 },
  西安: { center: [108.9402, 34.3416], zoom: 11 },
  苏州: { center: [120.6195, 31.2990], zoom: 12 },
  天津: { center: [117.1901, 39.1256], zoom: 11 },
  长沙: { center: [112.9388, 28.2282], zoom: 12 },
  郑州: { center: [113.6254, 34.7466], zoom: 11 },
  青岛: { center: [120.3826, 36.0671], zoom: 11 },
  厦门: { center: [118.0894, 24.4798], zoom: 12 },
  大连: { center: [121.6147, 38.9140], zoom: 11 },
  宁波: { center: [121.5440, 29.8683], zoom: 11 },
  无锡: { center: [120.3119, 31.4912], zoom: 12 },
  佛山: { center: [113.1219, 23.0218], zoom: 11 },
};

const STORAGE_KEY = "tb_selected_city";

export type CityInfo = {
  name: string;
  center: [number, number];
  zoom: number;
  spotCount?: number;
};

type CitySelectorProps = {
  cities: CityInfo[];
  currentCity: string;
  onCityChange: (city: CityInfo) => void;
  className?: string;
};

export function CitySelector({ cities, currentCity, onCityChange, className }: CitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAddMode(false);
        setSearch("");
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // 打开时聚焦搜索框
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // 合并用户城市和预设城市
  const allCities = useMemo(() => {
    const cityMap = new Map<string, CityInfo>();
    // 先添加用户有记录的城市
    for (const c of cities) {
      cityMap.set(c.name, c);
    }
    // 添加预设城市（如果用户没有记录）
    for (const [name, info] of Object.entries(PRESET_CITIES)) {
      if (!cityMap.has(name)) {
        cityMap.set(name, { name, ...info, spotCount: 0 });
      }
    }
    return Array.from(cityMap.values());
  }, [cities]);

  // 搜索过滤
  const filteredCities = useMemo(() => {
    if (!search.trim()) return allCities;
    const q = search.trim().toLowerCase();
    return allCities.filter((c) => c.name.toLowerCase().includes(q));
  }, [allCities, search]);

  // 用户有记录的城市排在前面
  const sortedCities = useMemo(() => {
    return [...filteredCities].sort((a, b) => {
      const aHas = (a.spotCount ?? 0) > 0 ? 1 : 0;
      const bHas = (b.spotCount ?? 0) > 0 ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      return (b.spotCount ?? 0) - (a.spotCount ?? 0);
    });
  }, [filteredCities]);

  const handleSelect = useCallback((city: CityInfo) => {
    onCityChange(city);
    setOpen(false);
    setSearch("");
    // 保存到本地存储
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, city.name);
    }
  }, [onCityChange]);

  const [addingCity, setAddingCity] = useState(false);
  
  const handleAddCity = useCallback(async () => {
    const name = newCityName.trim();
    if (!name || addingCity) return;
    
    // 检查是否在预设中
    const preset = PRESET_CITIES[name];
    if (preset) {
      handleSelect({ name, ...preset, spotCount: 0 });
      setNewCityName("");
      setAddMode(false);
      return;
    }
    
    // 使用高德地理编码 API 获取城市中心坐标
    setAddingCity(true);
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(name)}`);
      const data = await res.json();
      
      if (data.center && Array.isArray(data.center) && data.center.length === 2) {
        const [lng, lat] = data.center;
        // 验证坐标有效性（中国范围）
        if (lng > 70 && lng < 140 && lat > 15 && lat < 55) {
          handleSelect({ name, center: [lng, lat], zoom: 12, spotCount: 0 });
        } else {
          alert(`城市"${name}"的坐标无效，请检查城市名称`);
          return;
        }
      } else {
        alert(data.error || `未找到城市"${name}"的坐标，请检查城市名称是否正确`);
        return;
      }
    } catch (err) {
      console.error("获取城市坐标失败:", err);
      alert("获取城市坐标失败，请稍后重试");
      return;
    } finally {
      setAddingCity(false);
    }
    
    setNewCityName("");
    setAddMode(false);
  }, [newCityName, handleSelect, addingCity]);

  const currentCityInfo = allCities.find((c) => c.name === currentCity);

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full border border-white/30 bg-black/40 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition hover:bg-black/55"
      >
        <MapPin className="h-3.5 w-3.5" />
        <span className="font-medium">{currentCity}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* 搜索框 */}
          <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
            <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索城市"
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-zinc-400 hover:text-zinc-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 城市列表 */}
          <div className="max-h-64 overflow-y-auto p-1">
            {sortedCities.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-zinc-400">
                未找到匹配的城市
              </div>
            ) : (
              sortedCities.map((city) => (
                <button
                  key={city.name}
                  onClick={() => handleSelect(city)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition",
                    city.name === currentCity
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className={cn("h-4 w-4", city.name === currentCity ? "text-amber-500" : "text-zinc-400")} />
                    <span className="text-sm font-medium">{city.name}</span>
                  </div>
                  {(city.spotCount ?? 0) > 0 && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {city.spotCount} 个点位
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* 添加新城市 */}
          <div className="border-t border-zinc-100 p-2 dark:border-zinc-800">
            {addMode ? (
              <div className="flex items-center gap-2">
                <input
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleAddCity(); }}
                  placeholder="输入城市名称"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  autoFocus
                />
                <button
                  onClick={() => void handleAddCity()}
                  disabled={!newCityName.trim() || addingCity}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
                >
                  {addingCity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {addingCity ? "定位中" : "添加"}
                </button>
                <button
                  onClick={() => { setAddMode(false); setNewCityName(""); }}
                  className="rounded-lg px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddMode(true)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <Plus className="h-4 w-4" />
                <span>添加其他城市</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 工具函数：从本地存储读取上次选择的城市
export function getStoredCity(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

// 工具函数：获取城市信息
export function getCityInfo(name: string): CityInfo | null {
  const preset = PRESET_CITIES[name];
  if (preset) return { name, ...preset };
  return null;
}

// 默认城市
export const DEFAULT_CITY = "武汉";
export const DEFAULT_CITY_INFO: CityInfo = {
  name: DEFAULT_CITY,
  ...PRESET_CITIES[DEFAULT_CITY],
};
