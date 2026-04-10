const fs = require('fs');
const content = `"use client";

import { CheckCircle2, ImagePlus, Loader2, MapPin, Phone, Share2, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEV_USER_ID } from "@/lib/constants/user";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils/cn";
import type { PrefRecord, PrefsSummary } from "@/types/pref";
import type { Spot } from "@/types/spot";

const INVITES_API = "/api/collaboration/invites";
const LEGACY_INVITES_API = "/api/collab-invites";
const MOOD_OPTIONS = [
  { value: "惊喜", emoji: "🥳", label: "惊喜" },
  { value: "舒服", emoji: "😊", label: "舒服" },
  { value: "一般", emoji: "🧐", label: "一般" },
  { value: "踩雷", emoji: "😮‍💨", label: "踩雷" },
] as const;
const DEFAULT_TAGS = ["辣味十足", "环境不错", "适合聚会", "性价比高"];

function warnLegacyInviteApiOnce() {
  if (typeof window === "undefined") return;
  const k = "tb_legacy_invites_warned";
  if (window.sessionStorage.getItem(k) === "1") return;
  window.sessionStorage.setItem(k, "1");
}

async function fetchInvitesApi(input: string, init?: RequestInit) {
  const res = await fetch(input, init);
  if (res.status !== 404) return res;
  const legacy = input.replace(INVITES_API, LEGACY_INVITES_API);
  warnLegacyInviteApiOnce();
  return fetch(legacy, init);
}

function getScoreColor(score: number | null | undefined) {
  if (score == null) return "text-zinc-400";
  if (score >= 4.5) return "text-rose-500";
  if (score >= 4) return "text-orange-500";
  if (score >= 3) return "text-amber-500";
  if (score >= 2) return "text-lime-500";
  return "text-zinc-400";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

type SpotBottomCardProps = {
  spot: Spot;
  className?: string;
  onClose: () => void;
  showPrefGuide?: boolean;
  onDismissPrefGuide?: () => void;
  invitedBy?: string;
  onSpotUpdated?: (spot: Spot) => void;
};

export function SpotBottomCard({ spot, className, onClose, showPrefGuide = false, onDismissPrefGuide, invitedBy, onSpotUpdated }: SpotBottomCardProps) {
  const { user } = useAuth();
  const userId = user?.id ?? DEV_USER_ID;

  const [prefs, setPrefs] = useState<PrefRecord[]>([]);
  const [summary, setSummary] = useState<PrefsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileMap, setProfileMap] = useState<Record<string, { displayName: string; avatarUrl: string | null }>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [overall, setOverall] = useState(8);
  const [emoji, setEmoji] = useState("");
  const [moodTag, setMoodTag] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiTagsLoading, setAiTagsLoading] = useState(false);
  const [inviteeId, setInviteeId] = useState("");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayPrefs = useMemo(() => [...prefs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [prefs]);

  const loadPrefs = async () => {
    setLoading(true);
    try {
      const res = await fetch(\`/api/spots/\${spot.id}/prefs\`, { headers: user?.id ? { "x-user-id": user.id } : undefined });
      const data = (await res.json()) as { prefs?: PrefRecord[]; summary?: PrefsSummary };
      if (!res.ok) { setPrefs([]); setSummary(null); return; }
      const list = data.prefs ?? [];
      setPrefs(list);
      setSummary(data.summary ?? null);
      if (list.length > 0) {
        const ids = [...new Set(list.map((p) => p.userId))];
        const pr = await fetch(\`/api/profiles?ids=\${encodeURIComponent(ids.join(","))}\`);
        const pj = (await pr.json()) as { profiles?: Record<string, { displayName: string; avatarUrl: string | null }> };
        if (pj.profiles) setProfileMap(pj.profiles);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadPrefs(); }, [spot.id, user?.id]);
  useEffect(() => { setSaveError(null); setSaveSuccess(null); setImages([]); setTags([]); setNote(""); setEmoji(""); setMoodTag(""); setOverall(8); }, [spot.id]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onClose]);

  const addTag = (raw: string) => { const t = raw.trim(); if (!t || tags.includes(t)) return; setTags((prev) => [...prev, t].slice(0, 8)); };
  const removeTag = (tag: string) => setTags((prev) => prev.filter((x) => x !== tag));

  const handleGenerateAiTags = async () => {
    setAiTagsLoading(true); setSaveError(null);
    try {
      const res = await fetch("/api/ai/tags", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ spotName: spot.name, note, overall: Math.max(1, Math.min(5, Math.round(overall / 2))), poiType: spot.categories?.[0], currentTags: tags }) });
      const data = (await res.json()) as { tags?: string[]; error?: string };
      if (!res.ok) { setSaveError(data.error ?? "AI 标签生成失败"); return; }
      setTags((prev) => [...new Set([...prev, ...(data.tags ?? [])])].slice(0, 8));
    } catch (err) { setSaveError(err instanceof Error ? err.message : "AI 标签生成失败"); } finally { setAiTagsLoading(false); }
  };

  const handleUploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = Array.from(files).slice(0, 3 - images.length);
    if (selected.length === 0) return;
    setUploading(true); setSaveError(null);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const formData = new FormData(); formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", headers: { "x-user-id": userId }, body: formData });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? "图片上传失败");
        uploaded.push(data.url);
      }
      setImages((prev) => [...prev, ...uploaded].slice(0, 3));
    } catch (err) { setSaveError(err instanceof Error ? err.message : "图片上传失败"); } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleSaveMine = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setSaveError(null); setSaveSuccess(null);
    try {
      const res = await fetch(\`/api/spots/\${spot.id}/prefs\`, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8", ...(user?.id ? { "x-user-id": user.id } : {}) }, body: JSON.stringify({ userId, overall: Math.max(1, Math.min(5, Math.round(overall / 2))), emoji: emoji.trim() || undefined, moodTag: moodTag.trim() || undefined, tags, note: note.trim() || undefined, images, invitedBy: invitedBy ?? undefined }) });
      const data = (await res.json()) as { error?: unknown };
      if (!res.ok) { setSaveError(typeof data.error === "string" ? data.error : "保存失败"); return; }
      await loadPrefs();
      setSaveSuccess("评价保存成功"); setNote(""); setImages([]); setTags([]); setEmoji(""); setMoodTag(""); onDismissPrefGuide?.();
      window.setTimeout(() => setSaveSuccess(null), 2400);
      onSpotUpdated?.({ ...spot, avgOverall: summary?.avgOverall ?? spot.avgOverall, prefCount: summary?.count ?? spot.prefCount });
    } catch (err) { setSaveError(err instanceof Error ? err.message : "保存失败"); } finally { setSaving(false); }
  };

  const handleInvite = async () => {
    const targetId = inviteeId.trim();
    if (!targetId) { setInviteMsg("请输入被邀请用户ID"); return; }
    try {
      const r = await fetchInvitesApi(\`\${INVITES_API}\`, { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": userId }, body: JSON.stringify({ spotId: spot.id, inviteeId: targetId }) });
      const d = (await r.json()) as { error?: unknown; duplicated?: boolean };
      if (!r.ok) { setInviteMsg(d.error ? String(d.error) : "邀请失败"); return; }
      setInviteMsg(d.duplicated ? "已存在待处理邀请" : "邀请已发送"); if (!d.duplicated) setInviteeId("");
    } catch { setInviteMsg("邀请失败"); }
  };

  const handleShare = async () => {
    const url = \`\${window.location.origin}/?spotId=\${spot.id}&ref=\${encodeURIComponent(userId)}\`;
    if (navigator.share) await navigator.share({ title: spot.name, url }); else await navigator.clipboard.writeText(url);
  };

  return (
    <div className={cn("spot-bottom-card pointer-events-auto max-h-[min(82vh,760px)] w-full overflow-hidden rounded-t-[28px] border border-zinc-200/80 bg-white shadow-[0_-12px_36px_rgba(0,0,0,0.16)] dark:border-zinc-700 dark:bg-zinc-900", className)}>
      <div className="flex justify-center pb-1 pt-2.5"><span className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-600" /></div>
      <div className="flex items-start justify-between gap-3 px-4 pb-3">
        <div className="min-w-0 flex-1"><h2 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">{spot.name}</h2><p className="mt-1 text-xs text-zinc-500">{summary?.count ?? prefs.length} 条评价 · 均分 {summary?.avgOverall ?? spot.avgOverall ?? "-"}</p></div>
        <button type="button" onClick={handleShare} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><Share2 className="h-5 w-5" /></button>
        <button type="button" onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
      </div>
      {showPrefGuide ? <div className="mx-4 mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-50"><div className="flex items-start justify-between gap-2"><p className="font-medium">店铺已保存到地图</p><button type="button" onClick={() => { onDismissPrefGuide?.(); onClose(); }} className="shrink-0 rounded px-1.5 py-0.5 text-xs underline-offset-2 hover:underline">稍后再说</button></div><p className="mt-1 text-xs opacity-90">继续补充本次探店体验，保存后会立即刷新评价列表。</p></div> : null}
      <div className="max-h-[calc(min(82vh,760px)-76px)] space-y-4 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {(saveSuccess || saveError) ? <div className={cn("flex items-center gap-2 rounded-2xl px-3 py-2 text-sm", saveSuccess ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>{saveSuccess ? <CheckCircle2 className="h-4 w-4" /> : null}<span>{saveSuccess ?? saveError}</span></div> : null}
        {spot.address ? <div className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-400"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span>{spot.address}</span></div> : null}
        {spot.phone ? <div className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-400"><Phone className="mt-0.5 h-4 w-4 shrink-0" /><span>{spot.phone}</span></div> : null}
        <form onSubmit={handleSaveMine} className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-700">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">写下你的喜爱值</p>
          <div className="mt-4"><div className="flex items-center justify-between text-xs text-zinc-500"><span>喜爱值</span><span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{overall}</span></div><input type="range" min={1} max={10} value={overall} onChange={(e) => setOverall(Number(e.target.value))} className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-violet-200 accent-violet-500" /><div className="mt-1 flex justify-between text-[11px] text-zinc-400"><span>1</span><span>10</span></div></div>
          <div className="mt-4"><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">情绪标签</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{MOOD_OPTIONS.map((item) => <button key={item.value} type="button" onClick={() => { setMoodTag(item.value); setEmoji(item.emoji); }} className={cn("rounded-2xl border px-3 py-3 text-center transition", moodTag === item.value ? "border-zinc-900 bg-zinc-50 shadow-sm dark:border-zinc-100 dark:bg-zinc-800" : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700")}><div className="text-2xl">{item.emoji}</div><div className="mt-1 text-xs font-medium text-zinc-900 dark:text-zinc-100">{item.label}</div></button>)}</div></div>
          <div className="mt-4"><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">文字评价（可选）</p><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="记录这次的用餐体验..." className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-violet-300 dark:border-zinc-700 dark:bg-zinc-950" /></div>
          <div className="mt-4"><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">上传图片（最多3张）</p><input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handleUploadImages(e.target.files)} /><div className="mt-2 flex gap-3">{Array.from({ length: 3 }).map((_, index) => { const imageUrl = images[index]; return <button key={index} type="button" onClick={() => fileInputRef.current?.click()} className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 hover:border-violet-300 hover:text-violet-500 dark:border-zinc-700 dark:bg-zinc-800">{imageUrl ? <img src={imageUrl} alt="uploaded" className="h-full w-full object-cover" /> : uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}</button>; })}</div></div>
          <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800"><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">AI 推荐标签</p><div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={() => void handleGenerateAiTags()} disabled={aiTagsLoading} className="rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">{aiTagsLoading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> 生成中</span> : "生成标签推荐"}</button><div className="flex flex-wrap gap-2">{[...DEFAULT_TAGS, ...tags].filter((tag, index, arr) => arr.indexOf(tag) === index).map((tag) => { const active = tags.includes(tag); return <button key={tag} type="button" onClick={() => active ? removeTag(tag) : addTag(tag)} className={cn("rounded-full border px-3 py-1.5 text-xs transition", active ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-200")}>#{tag}</button>; })}<button type="button" onClick={() => addTag(tagInput)} className="rounded-full border border-dashed border-zinc-300 px-3 py-1.5 text-xs text-zinc-500 dark:border-zinc-700">+ 自定义</button></div></div><div className="mt-3 flex gap-2"><input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); setTagInput(""); } }} placeholder="输入自定义标签" className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-950" /><button type="button" onClick={() => { addTag(tagInput); setTagInput(""); }} className="rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">添加</button></div></div>
          <button type="submit" disabled={saving || uploading} className="mt-4 inline-flex items-center justify-center rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-400 disabled:opacity-60">{saving ? "保存中…" : "保存评价"}</button>
        </form>
        <section className="rounded-3xl border border-zinc-200 p-4 dark:border-zinc-700"><div className="flex items-center justify-between"><p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">评价列表</p><span className="text-xs text-zinc-500">按时间倒序</span></div><div className="mt-3 space-y-3">{loading ? <p className="text-sm text-zinc-500">加载评价中…</p> : null}{!loading && displayPrefs.length === 0 ? <p className="text-sm text-zinc-500">还没有评价，来写第一条吧。</p> : null}{displayPrefs.map((pref) => { const profile = profileMap[pref.userId]; const avatarFallback = (profile?.displayName ?? pref.userId).slice(0, 1).toUpperCase(); return <article key={pref.id} className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/60"><div className="flex items-start gap-3">{profile?.avatarUrl ? <img src={profile.avatarUrl} alt={profile.displayName} className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-sm font-semibold text-amber-600">{avatarFallback}</div>}<div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{profile?.displayName ?? \`\${pref.userId.slice(0, 6)}…\`}</p><p className="text-[11px] text-zinc-500">{formatDateTime(pref.updatedAt)}</p></div><div className={cn("flex items-center gap-1 text-sm font-semibold", getScoreColor(pref.overall))}><Star className="h-4 w-4 fill-current" /><span>{pref.overall}</span></div></div><div className="mt-2 flex flex-wrap gap-2">{pref.moodTag ? <span className="rounded-full bg-white px-2.5 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">{pref.emoji ?? "🙂"} {pref.moodTag}</span> : null}{pref.tags.map((tag) => <span key={tag} className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">#{tag}</span>)}</div>{pref.note ? <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-200">{pref.note}</p> : null}{pref.images.length > 0 ? <div className="mt-3 flex gap-2 overflow-x-auto">{pref.images.map((image) => <img key={image} src={image} alt="review" className="h-20 w-20 rounded-xl object-cover" />)}</div> : null}</div></div></article>; })}</div></section>
        <section className="rounded-3xl border border-violet-200/70 bg-violet-50/60 p-4 dark:border-violet-900/40 dark:bg-violet-950/20"><p className="text-sm font-medium text-violet-800 dark:text-violet-200">邀请协作记录</p><div className="mt-2 flex gap-2"><input value={inviteeId} onChange={(e) => setInviteeId(e.target.value)} placeholder="输入被邀请 userId" className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" /><button type="button" onClick={handleInvite} className="rounded-xl bg-violet-500 px-3 py-2 text-sm text-white">邀请</button></div>{inviteMsg ? <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{inviteMsg}</p> : null}</section>
      </div>
    </div>
  );
}
`;
fs.writeFileSync('src/features/map/components/SpotBottomCard.tsx', content, 'utf8');
console.log('done');
