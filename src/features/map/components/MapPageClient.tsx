"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AddSpotInitial } from "./AddSpotSheet";
import { AddSpotSheet } from "./AddSpotSheet";
import { MapLegend } from "./MapLegend";
import { MapView } from "./MapView";
import { PoiSearchBar } from "./PoiSearchBar";
import { SpotBottomCard } from "./SpotBottomCard";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { PoiSearchItem } from "@/types/poi-search";
import type { Spot } from "@/types/spot";

type AddDraft = { lat: number; lng: number; initial?: AddSpotInitial | null };
type SemanticFilters = { tags?: string[]; overall_min?: number | null; overall_max?: number | null; categories?: string[]; keyword?: string | null };
type IntentResponse = { filters?: SemanticFilters; summary?: string; error?: string };

function toSpotsQuery(filters: SemanticFilters | null): string {
  if (!filters) return "";
  const p = new URLSearchParams();
  for (const t of filters.tags ?? []) p.append("tag", t);
  for (const c of filters.categories ?? []) p.append("category", c);
  if (typeof filters.overall_min === "number") p.set("overallMin", String(filters.overall_min));
  if (typeof filters.overall_max === "number") p.set("overallMax", String(filters.overall_max));
  if (filters.keyword) p.set("keyword", filters.keyword);
  const s = p.toString();
  return s ? `?${s}` : "";
}

function hasAnyFilter(f: SemanticFilters | null): boolean {
  if (!f) return false;
  return Boolean((f.tags?.length ?? 0) || (f.categories?.length ?? 0) || typeof f.overall_min === "number" || typeof f.overall_max === "number" || f.keyword);
}

export function MapPageClient() {
  const { user, displayName, avatarUrl, signOut } = useAuth();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [addDraft, setAddDraft] = useState<AddDraft | null>(null);
  const [prefGuideSpotId, setPrefGuideSpotId] = useState<string | null>(null);
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [sharedViewOwner, setSharedViewOwner] = useState<string | null>(null);

  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticBaseSummary, setSemanticBaseSummary] = useState<string | null>(null);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SemanticFilters | null>(null);
  const [layerMode, setLayerMode] = useState<"all" | "mine" | "shared">("all");
  const [sharedMaps, setSharedMaps] = useState<Array<{ ownerId: string; ownerProfile: { display_name?: string | null; avatar_url?: string | null } | null }>>([]);
  const [sharedOwnerId, setSharedOwnerId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("tb_reduce_motion") === "1";
    }
    return false;
  });

  const semanticSummary = useMemo(() => {
    if (!semanticBaseSummary || !hasAnyFilter(activeFilters)) return semanticBaseSummary;
    return `${semanticBaseSummary} · 命中 ${spots.length} 个点位`;
  }, [semanticBaseSummary, activeFilters, spots.length]);

  const fetchSpots = useCallback(async (filters: SemanticFilters | null = null, options?: { ownerId?: string | null; layer?: "all" | "mine" | "shared" }) => {
    const uid = user?.id ? `userId=${encodeURIComponent(user.id)}` : "";
    const params = new URLSearchParams(window.location.search);
    const ownerId = options?.ownerId ?? params.get("ownerId");
    const ownerParam = ownerId ? `ownerId=${encodeURIComponent(ownerId)}` : "";
    const layerParam = options?.layer ? `layer=${options.layer}` : "";
    const q = toSpotsQuery(filters);
    const sep = q ? "&" : "?";
    const res = await fetch(`/api/spots${q}${uid || ownerParam || layerParam ? `${sep}${[uid, ownerParam, layerParam].filter(Boolean).join("&")}` : ""}`);
    const data = (await res.json()) as { spots?: Spot[]; error?: string };
    if (!res.ok) {
      setLoadError(data.error ?? res.statusText ?? "加载失败");
      return;
    }
    setLoadError(data.error ?? null);
    setSpots(data.spots ?? []);
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchSpots(null);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "加载点位失败");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchSpots]);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/maps/${encodeURIComponent(user.id)}/shared`, { headers: { "x-user-id": user.id } })
      .then((r) => r.json())
      .then((d) => setSharedMaps((d.items ?? []).map((x: { ownerId: string; ownerProfile: { display_name?: string | null; avatar_url?: string | null } | null }) => ({ ownerId: x.ownerId, ownerProfile: x.ownerProfile ?? null }))))
      .catch(() => setSharedMaps([]));
  }, [user?.id]);

  useEffect(() => {
    if (spots.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("spotId");
    const ref = params.get("ref");
    const ownerId = params.get("ownerId");
    setSharedViewOwner(ownerId);
    if (layerMode === "shared" && !sharedOwnerId && sharedMaps.length > 0) {
      setSharedOwnerId(sharedMaps[0]?.ownerId ?? null);
    }
    if (!sid) return;
    const found = spots.find((s) => s.id === sid);
    if (found) {
      setSelectedSpot(found);
      if (ref) setInvitedBy(ref);
    }
  }, [spots, layerMode, sharedMaps, sharedOwnerId]);

  const handleSemanticSearch = useCallback(async (forcedQuery?: string) => {
    const q = (forcedQuery ?? semanticQuery).trim();
    if (!q) return;
    setSemanticLoading(true);
    setSelectedSpot(null);
    setSemanticQuery(q);
    try {
      const intentRes = await fetch("/api/ai/search/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ query: q }),
      });
      const intentData = (await intentRes.json()) as IntentResponse;
      if (!intentRes.ok || !intentData.filters) {
        const fallback: SemanticFilters = { keyword: q };
        setActiveFilters(fallback);
        setSemanticBaseSummary("AI 解析失败，已按关键词搜索");
        await fetchSpots(fallback, { ownerId: layerMode === "shared" ? sharedOwnerId : undefined, layer: layerMode });
        return;
      }
      setActiveFilters(intentData.filters);
      setSemanticBaseSummary(intentData.summary ?? "已按语义条件筛选");
      await fetchSpots(intentData.filters, { ownerId: layerMode === "shared" ? sharedOwnerId : undefined, layer: layerMode });
    } catch {
      const fallback: SemanticFilters = { keyword: q };
      setActiveFilters(fallback);
      setSemanticBaseSummary("网络异常，已按关键词搜索");
      await fetchSpots(fallback, { ownerId: layerMode === "shared" ? sharedOwnerId : undefined, layer: layerMode });
    } finally {
      setSemanticLoading(false);
    }
  }, [fetchSpots, semanticQuery, layerMode, sharedOwnerId]);

  const clearSemanticSearch = useCallback(async () => {
    setSemanticQuery("");
    setSemanticBaseSummary(null);
    setActiveFilters(null);
    await fetchSpots(null, { ownerId: layerMode === "shared" ? sharedOwnerId : undefined, layer: layerMode });
  }, [fetchSpots, layerMode, sharedOwnerId]);

  const handleSpotSelect = useCallback((spot: Spot | null) => {
    setSelectedSpot(spot);
    if (!spot) setPrefGuideSpotId(null);
  }, []);
  const handleCloseCard = useCallback(() => {
    setSelectedSpot(null);
    setPrefGuideSpotId(null);
    setInvitedBy(null);
  }, []);
  const handleCloseAdd = useCallback(() => setAddDraft(null), []);

  const handlePoiPick = useCallback((poi: PoiSearchItem) => {
    setSelectedSpot(null);
    setPrefGuideSpotId(null);
    const fromType = poi.typeName ? poi.typeName.split(/[;；]/).map((s) => s.trim()).filter(Boolean) : [];
    const fromTags = poi.poiTags ?? [];
    const categories = [...new Set([...fromType, ...fromTags])].slice(0, 12);
    setAddDraft({
      lat: poi.lat,
      lng: poi.lng,
      initial: {
        name: poi.name,
        address: poi.address,
        phone: poi.phone,
        placeId: poi.placeId,
        businessHours: poi.businessHours,
        gaodeRating: poi.rating,
        avgPrice: poi.avgPrice,
        categories,
      },
    });
  }, []);

  const handleLayerChange = useCallback(async (mode: "all" | "mine" | "shared") => {
    setLayerMode(mode);
    setSelectedSpot(null);
    setPrefGuideSpotId(null);
    if (mode === "shared") {
      const owner = sharedOwnerId ?? sharedMaps[0]?.ownerId ?? null;
      setSharedOwnerId(owner);
      await fetchSpots(activeFilters, { ownerId: owner, layer: "shared" });
    } else if (mode === "mine") {
      setSharedOwnerId(null);
      await fetchSpots(activeFilters, { ownerId: null, layer: "mine" });
    } else {
      setSharedOwnerId(null);
      await fetchSpots(activeFilters, { ownerId: null, layer: "all" });
    }
  }, [activeFilters, fetchSpots, sharedMaps, sharedOwnerId]);

  const handleSharedOwnerChange = useCallback(async (ownerId: string) => {
    setSharedOwnerId(ownerId);
    await fetchSpots(activeFilters, { ownerId, layer: "shared" });
  }, [activeFilters, fetchSpots]);

  return (
    <div className="relative flex h-dvh w-full flex-col">
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex flex-col gap-2 bg-gradient-to-b from-black/55 via-black/35 to-transparent px-3 pb-2 pt-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="pointer-events-auto order-1 flex min-w-0 items-center gap-2">
            <span className="text-lg font-semibold tracking-tight text-white">TasteBridge</span>
            <a href="/profile" className="flex items-center gap-1.5 rounded-full border border-white/35 bg-black/35 px-2.5 py-1 text-xs text-white/95 hover:bg-black/55">
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-4 w-4 rounded-full object-cover" /> : <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold">{displayName.slice(0, 1).toUpperCase()}</span>}
              <span className="max-[420px]:hidden">{displayName}</span>
            </a>
            <NotificationBell />
            <button onClick={signOut} className="max-[420px]:hidden rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-xs text-white/70 hover:bg-black/50">退出</button>
          </div>
          <PoiSearchBar className="pointer-events-auto order-3 basis-full min-w-0 sm:order-2 sm:basis-auto sm:flex-1 sm:max-w-xl" onPick={handlePoiPick} />
          <div className="pointer-events-auto order-4 flex flex-wrap items-center gap-1.5">
            {(["all", "mine", "shared"] as const).map((m) => (
              <button key={m} onClick={() => void handleLayerChange(m)} className={`rounded-full border px-2.5 py-1 text-[11px] ${layerMode === m ? "border-amber-400 bg-amber-400 text-white" : "border-white/30 bg-black/35 text-white/80 hover:bg-black/50"}`}>
                {m === "all" ? "全部" : m === "mine" ? "我的足迹" : "共享地图"}
              </button>
            ))}
            {layerMode === "shared" && sharedMaps.length > 0 ? (
              <select value={sharedOwnerId ?? sharedMaps[0]?.ownerId ?? ""} onChange={(e) => void handleSharedOwnerChange(e.target.value)} className="rounded-full border border-white/25 bg-black/40 px-2 py-1 text-[11px] text-white/90">
                {sharedMaps.map((m) => (
                  <option key={m.ownerId} value={m.ownerId}>{m.ownerProfile?.display_name ?? m.ownerId.slice(0, 6)} 的共享地图</option>
                ))}
              </select>
            ) : null}
          </div>
          {loadError ? <span className="pointer-events-auto order-2 ml-auto max-w-[45%] truncate text-xs text-amber-200 sm:order-3 sm:max-w-[28%]">{loadError}</span> : <span className="order-2 ml-auto text-xs text-white/90 sm:order-3">{layerMode === "mine" ? "我的足迹" : layerMode === "shared" ? "共享地图" : "全部图层"} · {spots.length} 个点位</span>}
        </div>

        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/20 bg-black/40 p-2 backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-emerald-300" />
          <input value={semanticQuery} onChange={(e) => setSemanticQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void handleSemanticSearch(); }} placeholder="语义搜索：如 适合约会的安静餐厅" className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/45 outline-none" />
          <button onClick={() => void handleSemanticSearch()} disabled={semanticLoading || !semanticQuery.trim()} className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-400 disabled:opacity-60">{semanticLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "AI 搜索"}</button>
          {hasAnyFilter(activeFilters) ? <button onClick={() => void clearSemanticSearch()} className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/20"><X className="h-3.5 w-3.5" /></button> : null}
        </div>

        {sharedViewOwner ? (
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs text-amber-100">
            <span>当前为共享视角</span>
            <span className="rounded-full bg-black/30 px-2 py-0.5 text-[11px]">{sharedViewOwner.slice(0, 6)}…</span>
            <button onClick={() => {const url = new URL(window.location.href); url.searchParams.delete("ownerId"); window.location.assign(url.toString());}} className="ml-auto rounded-md bg-black/30 px-2 py-0.5 text-[11px] text-white/80">退出共享视角</button>
          </div>
        ) : null}
        {semanticSummary ? <div className="pointer-events-auto rounded-lg bg-emerald-900/35 px-3 py-1.5 text-xs text-emerald-100">{semanticSummary}</div> : null}
      </header>

      <MapView spots={spots} selectedSpotId={selectedSpot?.id ?? null} onSpotSelect={handleSpotSelect} reduceMotion={reduceMotion} className="h-full w-full flex-1" />
      <MapLegend reduceMotion={reduceMotion} onReduceMotionChange={setReduceMotion} />

      {selectedSpot && !addDraft ? <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"><SpotBottomCard spot={selectedSpot} onClose={handleCloseCard} showPrefGuide={prefGuideSpotId === selectedSpot.id} onDismissPrefGuide={() => setPrefGuideSpotId(null)} invitedBy={invitedBy ?? undefined} onSpotUpdated={(nextSpot) => { setSelectedSpot(nextSpot); setSpots((prev) => prev.map((s) => s.id === nextSpot.id ? { ...s, ...nextSpot } : s)); }} className="max-w-lg" /></div> : null}

      {addDraft ? <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[25] flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"><AddSpotSheet lat={addDraft.lat} lng={addDraft.lng} initial={addDraft.initial} variant={addDraft.initial ? "poi" : "pin"} withLinkedPref={addDraft.initial == null} onClose={handleCloseAdd} onSuccess={async () => { setActiveFilters(null); setSemanticBaseSummary(null); await fetchSpots(null); }} onSpotCreated={(spot) => { setPrefGuideSpotId(spot.id); setSelectedSpot(spot); }} className="max-w-lg" /></div> : null}
    </div>
  );
}
