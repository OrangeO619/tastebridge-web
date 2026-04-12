"use client";

import { ArrowLeft, Heart, Loader2, MapPin, Music, Pause, Play, RefreshCw, SkipForward, Star, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils/cn";

/* ---------- types ---------- */
type FriendProfile = { id: string; displayName: string | null; avatarUrl: string | null };

type UserPref = {
  id: string;
  overall: number;
  tags: string[];
  moodTag: string | null;
  emoji: string | null;
  note: string | null;
  images: string[];
  createdAt: string;
};

type CommonSpot = {
  spotId: string;
  name: string;
  address: string;
  categories: string[];
  latestDate: string;
  userA: { id: string; profile: { displayName: string; avatarUrl: string | null }; pref: UserPref | null };
  userB: { id: string; profile: { displayName: string; avatarUrl: string | null }; pref: UserPref | null };
};

type MusicTrack = { id: string; name: string; artist: string; url: string; cover: string };

type TogetherData = {
  users: { userA: { id: string; displayName: string; avatarUrl: string | null }; userB: { id: string; displayName: string; avatarUrl: string | null } };
  stats: { totalCommonVisits: number; tasteSimilarity: number; moodOverlap: number };
  insight: string;
  music: { searchQuery: string; reason: string; track: MusicTrack | null };
  commonSpots: CommonSpot[];
};

/* ---------- helpers ---------- */
function scoreColor(v: number) {
  if (v >= 4.5) return "text-rose-400";
  if (v >= 3.5) return "text-orange-400";
  if (v >= 2.5) return "text-amber-400";
  return "text-zinc-400";
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function Avatar({ src, name, size = "md" }: { src?: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  if (src) return <img src={src} alt={name} className={cn(cls, "rounded-full object-cover ring-2 ring-white/20")} />;
  return <div className={cn(cls, "flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 font-bold text-white")}>{name.slice(0, 1).toUpperCase()}</div>;
}

/* ---------- main component ---------- */
export default function TogetherPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);

  const [data, setData] = useState<TogetherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Music player state
  const [playing, setPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load friends list
  useEffect(() => {
    if (!userId) { setFriendsLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/follows?userId=${encodeURIComponent(userId)}`);
        const d = await r.json();
        if (cancelled) return;
        setFriends((d.followingProfiles ?? []).filter((f: FriendProfile) => f.id !== userId));
      } catch { if (!cancelled) setFriends([]); }
      finally { if (!cancelled) setFriendsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  const loadTogether = useCallback(async (friendId: string) => {
    if (!userId || !friendId) return;
    setLoading(true); setError(null); setData(null);
    setPlaying(false); setCurrentTrack(null);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    try {
      const r = await fetch(`/api/ai/summary/together?userId=${encodeURIComponent(userId)}&friendId=${encodeURIComponent(friendId)}`, { headers: { "x-user-id": userId } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "加载失败");
      setData(d as TogetherData);
      if (d.music?.track?.url) {
        setCurrentTrack(d.music.track);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "加载失败"); }
    finally { setLoading(false); }
  }, [userId]);

  const handleSelectFriend = (friend: FriendProfile) => {
    setSelectedFriend(friend);
    void loadTogether(friend.id);
  };

  const handleBack = () => {
    setSelectedFriend(null);
    setData(null);
    setError(null);
    setPlaying(false);
    setCurrentTrack(null);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  };

  const togglePlay = () => {
    if (!currentTrack?.url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(currentTrack.url);
      audioRef.current.addEventListener("ended", () => setPlaying(false));
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => setPlaying(false)); setPlaying(true); }
  };

  const handleNextTrack = async () => {
    if (!data || !userId || !selectedFriend) return;
    setTrackLoading(true);
    try {
      const r = await fetch(`/api/ai/summary/together?userId=${encodeURIComponent(userId)}&friendId=${encodeURIComponent(selectedFriend.id)}`, { headers: { "x-user-id": userId } });
      const d = await r.json() as TogetherData;
      if (d.music?.track?.url && d.music.track.url !== currentTrack?.url) {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        setPlaying(false);
        setCurrentTrack(d.music.track);
        setData((prev) => prev ? { ...prev, music: d.music } : prev);
      }
    } catch { /* ignore */ }
    finally { setTrackLoading(false); }
  };

  /* ---------- render: friend selection ---------- */
  if (!selectedFriend) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-zinc-900 via-stone-900 to-zinc-800">
        <div className="sticky top-0 z-10 flex items-center gap-3 bg-black/40 px-4 py-3 backdrop-blur-md">
          <a href="/profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><ArrowLeft className="h-4 w-4" /></a>
          <h1 className="flex-1 text-base font-semibold text-white">共同回忆</h1>
        </div>
        <div className="mx-auto max-w-lg px-4 pb-12 pt-6">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">选择一位好友</h2>
            <p className="mt-1 text-sm text-white/50">查看你们共同的美食回忆</p>
          </div>
          {friendsLoading ? (
            <div className="flex justify-center pt-12"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>
          ) : friends.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-white/30" />
              <p className="text-sm text-white/50">还没有关注的好友</p>
              <p className="mt-1 text-xs text-white/35">先去个人中心添加好友吧</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <button key={f.id} onClick={() => handleSelectFriend(f)} className="flex w-full items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/12">
                  <Avatar src={f.avatarUrl} name={f.displayName ?? f.id} />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium text-white">{f.displayName ?? f.id.slice(0, 6)}</p>
                    <p className="truncate text-[11px] text-white/40">{f.id.slice(0, 8)}…</p>
                  </div>
                  <span className="text-xs text-white/30">查看回忆 →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- render: together detail ---------- */
  const friendName = data?.users.userB.displayName ?? selectedFriend.displayName ?? "好友";

  return (
    <div className="min-h-dvh bg-zinc-100 dark:bg-zinc-900">
      {/* Back button */}
      <div className="mx-auto max-w-lg px-4 pt-4">
        <button onClick={handleBack} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"><ArrowLeft className="h-4 w-4" /></button>
      </div>

      <div className="mx-auto max-w-lg px-4 pb-12 pt-3 space-y-4">
        {/* Header gradient card */}
        <div className="rounded-2xl bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 px-4 pb-5 pt-4">
          <h1 className="text-xl font-bold text-white">与 {friendName} 的回忆</h1>
          <p className="mt-1 text-sm text-white/80">你们的美食之旅数据</p>
          
          {/* Stats in gradient card */}
          {data && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{data.stats.totalCommonVisits}</p>
                <p className="mt-0.5 text-xs text-white/70">共同探店</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{data.stats.tasteSimilarity}%</p>
                <p className="mt-0.5 text-xs text-white/70">口味相似度</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{data.stats.moodOverlap}%</p>
                <p className="mt-0.5 text-xs text-white/70">情绪重合度</p>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 pt-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-sm text-zinc-500">正在生成你们的共同回忆…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-200">{error}</div>
        ) : data ? (
          <>
            {/* Music Player - simplified bar style */}
            <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm dark:bg-zinc-800">
              {currentTrack?.cover ? (
                <img src={currentTrack.cover} alt="" className={cn("h-12 w-12 rounded-xl object-cover", playing && "animate-pulse")} />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-orange-400"><Music className="h-5 w-5 text-white" /></div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-zinc-400">为你们推荐</p>
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{currentTrack?.name ?? data.music.searchQuery}</p>
                <p className="truncate text-xs text-zinc-500">{currentTrack?.artist ?? ""}</p>
              </div>
              <button onClick={() => void handleNextTrack()} disabled={trackLoading} className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700">
                {trackLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "换一首"}
              </button>
            </div>

            {/* Common Spots */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">共同去过的店铺</p>
                <span className="text-xs text-zinc-400">{data.commonSpots.length} 家</span>
              </div>
              {data.commonSpots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="text-sm text-zinc-500">还没有共同探店记录</p>
                  <p className="mt-1 text-xs text-zinc-400">快约好友一起去打卡吧</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.commonSpots.map((spot) => (
                    <div key={spot.spotId} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-zinc-800">
                      {/* Spot header */}
                      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-700">
                        <div>
                          <a href={`/?spotId=${spot.spotId}`} className="text-sm font-semibold text-zinc-900 hover:text-orange-500 hover:underline dark:text-white dark:hover:text-orange-400">{spot.name}</a>
                          {spot.address && <p className="mt-0.5 text-xs text-zinc-400">{spot.address}</p>}
                        </div>
                        <span className="text-xs text-zinc-400">{formatDate(spot.latestDate)}</span>
                      </div>

                      {/* Both users' reviews - side by side */}
                      <div className="grid grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-700">
                        {/* My review */}
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar src={spot.userA.profile.avatarUrl} name={spot.userA.profile.displayName} size="sm" />
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{spot.userA.profile.displayName}</span>
                          </div>
                          {spot.userA.pref?.images && spot.userA.pref.images.length > 0 && (
                            <div className="flex gap-1.5 overflow-x-auto">
                              {spot.userA.pref.images.map((url, i) => <img key={i} src={url} alt="" className="h-20 w-20 flex-shrink-0 rounded-xl object-cover" />)}
                            </div>
                          )}
                          {spot.userA.pref ? (
                            <div className="mt-2">
                              <div className="flex items-center gap-1">
                                <Star className={cn("h-3.5 w-3.5 fill-current", scoreColor(spot.userA.pref.overall))} />
                                <span className={cn("text-xs font-semibold", scoreColor(spot.userA.pref.overall))}>{spot.userA.pref.overall}</span>
                                {spot.userA.pref.emoji && <span className="text-sm">{spot.userA.pref.emoji}</span>}
                              </div>
                              {spot.userA.pref.note && <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2">{spot.userA.pref.note}</p>}
                            </div>
                          ) : (
                            <p className="mt-2 text-[11px] text-zinc-400">暂无评价</p>
                          )}
                        </div>

                        {/* Friend's review */}
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar src={spot.userB.profile.avatarUrl} name={spot.userB.profile.displayName} size="sm" />
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{spot.userB.profile.displayName}</span>
                          </div>
                          {spot.userB.pref?.images && spot.userB.pref.images.length > 0 && (
                            <div className="flex gap-1.5 overflow-x-auto">
                              {spot.userB.pref.images.map((url, i) => <img key={i} src={url} alt="" className="h-20 w-20 flex-shrink-0 rounded-xl object-cover" />)}
                            </div>
                          )}
                          {spot.userB.pref ? (
                            <div className="mt-2">
                              <div className="flex items-center gap-1">
                                <Star className={cn("h-3.5 w-3.5 fill-current", scoreColor(spot.userB.pref.overall))} />
                                <span className={cn("text-xs font-semibold", scoreColor(spot.userB.pref.overall))}>{spot.userB.pref.overall}</span>
                                {spot.userB.pref.emoji && <span className="text-sm">{spot.userB.pref.emoji}</span>}
                              </div>
                              {spot.userB.pref.note && <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2">{spot.userB.pref.note}</p>}
                            </div>
                          ) : (
                            <p className="mt-2 text-[11px] text-zinc-400">暂无评价</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
