"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { PoiSearchItem } from "@/types/poi-search";

type SuggestItem = {
  placeId: string;
  name: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  typecode?: string;
};

type PoiSearchBarProps = {
  onPick: (poi: PoiSearchItem) => void;
  className?: string;
};

export function PoiSearchBar({ onPick, className }: PoiSearchBarProps) {
  const [keywords, setKeywords] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PoiSearchItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"suggest" | "search">("suggest");
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 实时输入提示（防抖）
  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const params = new URLSearchParams({ keywords: q.trim() });
        if (city.trim()) {
          params.set("city", city.trim());
        }
        const res = await fetch(`/api/poi/suggest?${params.toString()}`);
        const data = (await res.json()) as {
          tips?: SuggestItem[];
          error?: string;
        };
        if (res.ok && data.tips) {
          setSuggestions(data.tips);
          setMode("suggest");
          setOpen(true);
        }
      } catch {
        // 静默失败，不影响用户输入
      }
    },
    [city],
  );

  // 输入变化时触发防抖搜索
  const handleInputChange = (value: string) => {
    setKeywords(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        void fetchSuggestions(value);
      }, 300);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  };

  // 完整搜索（点击搜索按钮或回车）
  const search = useCallback(async () => {
    const q = keywords.trim();
    if (!q) {
      setError("请输入店名或关键词");
      return;
    }
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const res = await fetch("/api/poi/search", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          keywords: q,
          city: city.trim() || undefined,
          cityLimit: Boolean(city.trim()),
          offset: 15,
          page: 1,
        }),
      });
      const data = (await res.json()) as {
        results?: PoiSearchItem[];
        error?: string;
      };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "搜索失败");
        setResults([]);
        setMode("search");
        setOpen(true);
        return;
      }
      if (typeof data.error === "string" && data.error) {
        setError(data.error);
      } else {
        setError(null);
      }
      setResults(data.results ?? []);
      setMode("search");
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
      setResults([]);
      setMode("search");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, [keywords, city]);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // 选择建议项，获取详情
  const handlePickSuggest = async (item: SuggestItem) => {
    setDetailLoadingId(item.placeId);
    try {
      const res = await fetch(
        `/api/poi/detail?placeId=${encodeURIComponent(item.placeId)}`,
      );
      const data = (await res.json()) as {
        poi?: PoiSearchItem;
        error?: string;
      };
      if (res.ok && data.poi) {
        onPick(data.poi);
      } else {
        // 如果详情获取失败，用建议项的基本信息
        onPick({
          placeId: item.placeId,
          name: item.name,
          address: item.address || item.district,
          lat: item.lat,
          lng: item.lng,
          typecode: item.typecode,
        });
      }
    } catch {
      onPick({
        placeId: item.placeId,
        name: item.name,
        address: item.address || item.district,
        lat: item.lat,
        lng: item.lng,
        typecode: item.typecode,
      });
    } finally {
      setDetailLoadingId(null);
      setOpen(false);
      setSuggestions([]);
      setResults([]);
      setKeywords("");
    }
  };

  // 选择搜索结果项
  const handlePick = async (poi: PoiSearchItem) => {
    setDetailLoadingId(poi.placeId);
    try {
      const res = await fetch(
        `/api/poi/detail?placeId=${encodeURIComponent(poi.placeId)}`,
      );
      const data = (await res.json()) as {
        poi?: PoiSearchItem;
        error?: string;
      };
      if (res.ok && data.poi) {
        onPick(data.poi);
      } else {
        onPick(poi);
      }
    } catch {
      onPick(poi);
    } finally {
      setDetailLoadingId(null);
      setOpen(false);
      setResults([]);
      setSuggestions([]);
      setKeywords("");
    }
  };

  const resultSubline = (poi: PoiSearchItem) => {
    const bits: string[] = [];
    if (poi.address) bits.push(poi.address);
    if (poi.rating) bits.push(`评分 ${poi.rating}`);
    if (poi.avgPrice) bits.push(poi.avgPrice);
    if (poi.phone) bits.push(poi.phone);
    return bits.length ? bits.join(" · ") : "无详细地址";
  };

  const suggestSubline = (item: SuggestItem) => {
    const bits: string[] = [];
    if (item.district) bits.push(item.district);
    if (item.address) bits.push(item.address);
    return bits.length ? bits.join(" · ") : "无详细地址";
  };

  const showSuggestions = mode === "suggest" && suggestions.length > 0;
  const showResults = mode === "search" && (results.length > 0 || error);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="flex items-center gap-1.5 sm:flex-row sm:gap-2">
        <div className="flex min-w-0 flex-1 gap-1.5 rounded-xl border border-white/25 bg-black/40 px-2 py-1 shadow-lg backdrop-blur-md dark:border-zinc-600/50 dark:bg-zinc-900/75 sm:gap-2 sm:py-1.5">
          <Search className="mt-1.5 h-3.5 w-3.5 shrink-0 text-white/70 sm:mt-2 sm:h-4 sm:w-4" aria-hidden />
          <input
            value={keywords}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void search();
            }}
            placeholder="搜店名，如：海底捞 火锅"
            className="min-w-0 flex-1 bg-transparent py-1 text-xs text-white placeholder:text-white/50 outline-none sm:py-1.5 sm:text-sm"
            autoComplete="off"
          />
        </div>
        <div className="flex shrink-0 gap-1.5 sm:gap-2">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="城市（可选）"
            className="hidden w-20 rounded-lg border border-white/25 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/45 outline-none backdrop-blur-md dark:border-zinc-600/50 dark:bg-zinc-900/75 sm:block sm:w-24 sm:rounded-xl sm:py-2 sm:text-sm"
          />
          <button
            type="button"
            onClick={() => void search()}
            disabled={loading}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-2 py-1.5 text-xs font-medium text-white shadow-md hover:bg-amber-600 disabled:opacity-60 sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            搜索
          </button>
        </div>
      </div>

      {open && (showSuggestions || showResults) ? (
        <ul
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[min(50vh,280px)] overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
          role="listbox"
        >
          {/* 输入提示模式 */}
          {showSuggestions &&
            suggestions.map((item) => (
              <li key={item.placeId}>
                <button
                  type="button"
                  disabled={detailLoadingId !== null}
                  onClick={() => void handlePickSuggest(item)}
                  className="flex w-full gap-2 border-b border-zinc-100 px-3 py-2.5 text-left last:border-0 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-800/80"
                >
                  {detailLoadingId === item.placeId ? (
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-600" />
                  ) : (
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                      {item.name}
                    </p>
                    <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {suggestSubline(item)}
                    </p>
                  </div>
                </button>
              </li>
            ))}

          {/* 搜索结果模式 */}
          {showResults && error && results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </li>
          ) : null}
          {showResults &&
            results.map((poi) => (
              <li key={poi.placeId}>
                <button
                  type="button"
                  disabled={detailLoadingId !== null}
                  onClick={() => void handlePick(poi)}
                  className="flex w-full gap-2 border-b border-zinc-100 px-3 py-2.5 text-left last:border-0 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-800/80"
                >
                  {detailLoadingId === poi.placeId ? (
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-600" />
                  ) : (
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                      {poi.name}
                    </p>
                    <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {resultSubline(poi)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}
