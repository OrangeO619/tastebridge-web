"use client";

import { ImagePlus, Loader2, MapPin, Phone, Share2, Sparkles, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEV_USER_ID } from "@/lib/constants/user";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils/cn";
import type { PrefRecord, PrefsSummary } from "@/types/pref";
import type { Spot } from "@/types/spot";

const INVITES_API = "/api/collaboration/invites";
const LEGACY_INVITES_API = "/api/collab-invites";

function warnLegacyInviteApiOnce() {
  if (typeof window === "undefined") return;
  const k = "tb_legacy_invites_warned";
  if (window.sessionStorage.getItem(k) === "1") return;
  window.sessionStorage.setItem(k, "1");
  console.warn("[TB][deprecated] 正在使用旧邀请接口 /api/collab-invites，请迁移到 /api/collaboration/invites");
}

async function fetchInvitesApi(input: string, init?: RequestInit) {
  const res = await fetch(input, init);
  if (res.status !== 404) return res;
  const legacy = input.replace(INVITES_API, LEGACY_INVITES_API);
  warnLegacyInviteApiOnce();
  return fetch(legacy, init);
}

type SpotBottomCardProps = {
  spot: Spot;
  className?: string;
  onClose: () => void;
  showPrefGuide?: boolean;
  onDismissPrefGuide?: () => void;
  invitedBy?: string;
};

export function SpotBottomCard({ spot, className, onClose, showPrefGuide = false, onDismissPrefGuide, invitedBy }: SpotBottomCardProps) {
  const { user } = useAuth();
  const userId = user?.id ?? DEV_USER_ID;

  const [prefs, setPrefs] = useState<PrefRecord[]>([]);
  const [summary, setSummary] = useState<PrefsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileMap, setProfileMap] = useState<Record<string, { displayName: string; avatarUrl: string | null }>>({});
  const [localPrefs, setLocalPrefs] = useState<PrefRecord[]>([]);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [overall, setOverall] = useState(4);
  const [emoji, setEmoji] = useState("");
  const [moodTag, setMoodTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiTagsLoading, setAiTagsLoading] = useState(false);

  const [inviteeId, setInviteeId] = useState("");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const popularTags = useMemo(() => ["约会", "朋友聚餐", "安静", "适合拍照", "回头客", "夜宵"], []);

  const displayPrefs = useMemo(() => {
    const merged = new Map<string, PrefRecord>();
    for (const p of localPrefs) merged.set(p.id, p);
    for (const p of prefs) merged.set(p.id, p);
    return Array.from(merged.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [localPrefs, prefs]);

  const loadPrefs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/spots/${spot.id}/prefs`);
      const data = (await res.json()) as { prefs?: PrefRecord[]; summary?: PrefsSummary };
      if (!res.ok) {
        setPrefs([]);
        setSummary(null);
      } else {
        const list = data.prefs ?? [];
        setPrefs(list);
        setSummary(data.summary ?? null);
        if (list.length > 0) {
          const ids = [...new Set(list.map((p) => p.userId))];
          const pr = await fetch(`/api/profiles?ids=${encodeURIComponent(ids.join(","))}`);
          const pj = (await pr.json()) as { profiles?: Record<string, { displayName: string; avatarUrl: string | null }> };
          if (pj.profiles) setProfileMap(pj.profiles);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPrefs();
  }, [spot.id]);

  useEffect(() => {
    setLocalPrefs([]);
    setSaveError(null);
    setSaveSuccess(null);
    setImages([]);
  }, [spot.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const addTag = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (tags.includes(t)) return;
    setTags((prev) => [...prev, t].slice(0, 8));
  };

  const handleSaveMine = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/spots/${spot.id}/prefs`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          userId,
          overall,
          emoji: emoji.trim() || undefined,
          moodTag: moodTag.trim() || undefined,
          tags,
          note: note.trim() || undefined,
          invitedBy: invitedBy ?? undefined,
        }),
      });
      const data = (await res.json()) as { error?: unknown };
      if (!res.ok) {
        setSaveError(typeof data.error === "string" ? data.error : "保存失败");
        return;
      }
      setNote("");
      onDismissPrefGuide?.();
      await loadPrefs();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    const targetId = inviteeId.trim();
    if (!targetId) {
      setInviteMsg("请输入被邀请用户ID");
      return;
    }
    try {
      const r = await fetchInvitesApi(`${INVITES_API}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ spotId: spot.id, inviteeId: targetId }),
      });
      const d = (await r.json()) as { error?: unknown; duplicated?: boolean };
      if (!r.ok) {
        setInviteMsg(d.error ? String(d.error) : "邀请失败");
        return;
      }
      setInviteMsg(d.duplicated ? "已存在待处理邀请" : "邀请已发送");
      if (!d.duplicated) setInviteeId("");
    } catch {
      setInviteMsg("邀请失败");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/?spotId=${spot.id}&ref=${encodeURIComponent(userId)}`;
    if (navigator.share) await navigator.share({ title: spot.name, url });
    else await navigator.clipboard.writeText(url);
  };

  return (
    <div className={cn("spot-bottom-card pointer-events-auto max-h-[min(74vh,560px)] w-full overflow-hidden rounded-t-2xl border border-zinc-200/80 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:border-zinc-700 dark:bg-zinc-900", className)}>
      <div className="flex justify-center pb-1 pt-2"><span className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" /></div>
      <div className="flex items-start justify-between gap-3 px-4 pb-2">
        <div className="min-w-0 flex-1"><h2 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">{spot.name}</h2></div>
        <button type="button" onClick={handleShare} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><Share2 className="h-5 w-5" /></button>
        <button type="button" onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
      </div>

      {showPrefGuide ? (
        <div className="mx-4 mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-50">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">店铺已保存到地图</p>
            <button type="button" onClick={() => { onDismissPrefGuide?.(); onClose(); }} className="shrink-0 rounded px-1.5 py-0.5 text-xs underline-offset-2 hover:underline">稍后再说</button>
          </div>
          <p className="mt-1 text-xs opacity-90">你可以稍后再补充情绪、标签和喜爱值。</p>
        </div>
      ) : null}

      <div className="max-h-[calc(min(74vh,560px)-72px)] space-y-3 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {spot.address ? <div className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-400"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span>{spot.address}</span></div> : null}
        {spot.phone ? <div className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-400"><Phone className="mt-0.5 h-4 w-4 shrink-0" /><span>{spot.phone}</span></div> : null}

        <section className="rounded-xl border border-zinc-100 bg-zinc-50/90 p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">喜爱值</p>
          {loading ? <p className="mt-1 text-xs text-zinc-500">加载中…</p> : <p className="mt-1 text-xs text-zinc-500">{summary?.count ?? prefs.length} 人评价，均分 {summary?.avgOverall ?? "-"}</p>}
        </section>

        <form onSubmit={handleSaveMine} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">写下你的喜爱值</p>
          <div className="mt-2 flex items-center gap-1">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} onClick={() => setOverall(n)} className="rounded p-1 text-amber-500"><Star className={cn("h-5 w-5", overall >= n ? "fill-amber-400" : "")} /></button>)}</div>

          <div className="mt-2 flex items-center gap-2">
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="情绪 Emoji（可选）" className="w-40 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none dark:border-zinc-600 dark:bg-zinc-900" />
            <input value={moodTag} onChange={(e) => setMoodTag(e.target.value)} placeholder="心情标签（可选）" className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none dark:border-zinc-600 dark:bg-zinc-900" />
          </div>

          <div className="mt-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-600">
            <div className="mb-1 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <button key={t} type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-500 dark:text-zinc-200">{t} ×</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); setTagInput(""); } }} placeholder="输入标签后回车" className="flex-1 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none dark:border-zinc-600 dark:bg-zinc-900" />
              <button type="button" onClick={() => { addTag(tagInput); setTagInput(""); }} className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs text-white dark:bg-zinc-200 dark:text-zinc-900">添加</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">{popularTags.map((t) => <button key={t} type="button" onClick={() => addTag(t)} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{t}</button>)}</div>
          </div>

          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="一句话短评（可选）" className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none dark:border-zinc-600 dark:bg-zinc-900" />
          {saveError ? <p className="mt-1 text-xs text-red-500">{saveError}</p> : null}
          <button type="submit" disabled={saving} className="mt-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{saving ? "保存中…" : "保存我的评价"}</button>
        </form>

        <section className="rounded-xl border border-violet-200/70 bg-violet-50/60 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
          <p className="text-sm font-medium text-violet-800 dark:text-violet-200">邀请协作记录</p>
          <div className="mt-2 flex gap-2"><input value={inviteeId} onChange={(e) => setInviteeId(e.target.value)} placeholder="输入被邀请 userId" className="flex-1 rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900" /><button type="button" onClick={handleInvite} className="rounded-lg bg-violet-500 px-3 py-1 text-xs text-white">邀请</button></div>
          {inviteMsg ? <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{inviteMsg}</p> : null}
        </section>
      </div>
    </div>
  );
}
