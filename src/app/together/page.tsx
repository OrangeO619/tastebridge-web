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
  return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
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
  const myProfile = data?.users.userA;
  const friendProfile = data?.users.userB;

  return (
    <div className="min-h-dvh bg-gradient-to-br from-zinc-900 via-stone-900 to-zinc-800">
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-black/40 px-4 py-3 backdrop-blur-md">
        <button onClick={handleBack} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><ArrowLeft className="h-4 w-4" /></button>
        <h1 className="flex-1 text-base font-semibold text-white">共同回忆</h1>
      </div>

      <div className="mx-auto max-w-lg px-4 pb-12 pt-4 space-y-5">
        {/* User pair header */}
        <div className="flex items-center justify-center gap-4 rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
          <div className="text-center">
            <Avatar src={myProfile?.avatarUrl} name={myProfile?.displayName ?? "我"} size="lg" />
            <p className="mt-1.5 text-xs font-medium text-white">{myProfile?.displayName ?? "我"}</p>
          </div>
          <div className="flex flex-col items-center">
            <Heart className="h-6 w-6 text-rose-400" />
            <span className="mt-0.5 text-[10px] text-white/40">vs</span>
          </div>
          <div className="text-center">
            <Avatar src={friendProfile?.avatarUrl} name={friendProfile?.displayName ?? selectedFriend.displayName ?? "好友"} size="lg" />
            <p className="mt-1.5 text-xs font-medium text-white">{friendProfile?.displayName ?? selectedFriend.displayName ?? "好友"}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 pt-12">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
            <p className="text-sm text-white/60">正在生成你们的共同回忆…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-900/30 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : data ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center rounded-2xl bg-white/8 px-3 py-3 ring-1 ring-white/10">
                <span className="text-xl font-bold text-sky-300">{data.stats.totalCommonVisits}</span>
                <span className="mt-0.5 text-[11px] text-white/55">共同探店</span>
              </div>
              <div className="flex flex-col items-center rounded-2xl bg-white/8 px-3 py-3 ring-1 ring-white/10">
                <span className="text-xl font-bold text-amber-300">{data.stats.tasteSimilarity}%</span>
                <span className="mt-0.5 text-[11px] text-white/55">口味相似</span>
              </div>
              <div className="flex flex-col items-center rounded-2xl bg-white/8 px-3 py-3 ring-1 ring-white/10">
                <span className="text-xl font-bold text-violet-300">{data.stats.moodOverlap}%</span>
                <span className="mt-0.5 text-[11px] text-white/55">情绪共鸣</span>
              </div>
            </div>

            {/* AI Insight */}
            <div className="rounded-2xl border border-sky-300/20 bg-gradient-to-br from-sky-500/10 to-violet-500/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">✨</span>
                <p className="text-xs font-semibold text-sky-200">AI 共同回忆洞察</p>
              </div>
              <p className="text-sm leading-relaxed text-white/85">{data.insight}</p>
            </div>

            {/* Music Player */}
            <div className="rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500/10 to-rose-500/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Music className="h-4 w-4 text-violet-300" />
                <p className="text-xs font-semibold text-violet-200">AI 推荐主题曲</p>
              </div>
              {currentTrack ? (
                <div className="flex items-center gap-3">
                  {currentTrack.cover ? (
                    <img src={currentTrack.cover} alt="" className={cn("h-14 w-14 rounded-xl object-cover shadow-lg", playing && "animate-pulse")} />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/20"><Music className="h-6 w-6 text-violet-300" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{currentTrack.name}</p>
                    <p className="truncate text-xs text-white/50">{currentTrack.artist}</p>
                    <p className="mt-1 text-[11px] text-violet-200/70">{data.music.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={togglePlay} className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500 text-white shadow-lg transition hover:bg-violet-400">
                      {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                    </button>
                    <button onClick={() => void handleNextTrack()} disabled={trackLoading} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 disabled:opacity-50">
                      {trackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SkipForward className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/20"><Music className="h-6 w-6 text-violet-300" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/70">{data.music.searchQuery}</p>
                    <p className="mt-1 text-[11px] text-violet-200/70">{data.music.reason}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Common Spots */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-amber-300" />
                <p className="text-sm font-semibold text-white">共同去过的店铺</p>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-300">{data.commonSpots.length} 家</span>
              </div>
              {data.commonSpots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center">
                  <p className="text-sm text-white/50">还没有共同探店记录</p>
                  <p className="mt-1 text-xs text-white/35">快约好友一起去打卡吧</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.commonSpots.map((spot) => (
                    <div key={spot.spotId} className="rounded-2xl bg-white/8 ring-1 ring-white/10 overflow-hidden">
                      {/* Spot header */}
                      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                        <MapPin className="h-3.5 w-3.5 text-amber-400/70" />
                        <h3 className="truncate text-sm font-semibold text-white">{spot.name}</h3>
                        {spot.address && <span className="ml-auto flex-shrink-0 text-[11px] text-white/35 truncate max-w-[140px]">{spot.address}</span>}
                      </div>
                      {spot.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 px-4 pb-2">
                          {spot.categories.slice(0, 4).map((c) => <span key={c} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">{c}</span>)}
                        </div>
                      )}

                      {/* Both users' reviews */}
                      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                        {/* My review */}
                        <div className="rounded-xl bg-white/5 p-2.5">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar src={spot.userA.profile.avatarUrl} name={spot.userA.profile.displayName} size="sm" />
                            <span className="text-xs font-medium text-white/80">{spot.userA.profile.displayName}</span>
                          </div>
                          {spot.userA.pref ? (
                            <>
                              <div className="flex items-center gap-1 mb-1.5">
                                <Star className={cn("h-3.5 w-3.5 fill-current", scoreColor(spot.userA.pref.overall))} />
                                <span className={cn("text-xs font-semibold", scoreColor(spot.userA.pref.overall))}>{spot.userA.pref.overall}</span>
                                {spot.userA.pref.emoji && <span className="text-sm">{spot.userA.pref.emoji}</span>}
                                {spot.userA.pref.moodTag && <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">{spot.userA.pref.moodTag}</span>}
                              </div>
                              {spot.userA.pref.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                  {spot.userA.pref.tags.slice(0, 3).map((t) => <span key={t} className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-white/50">#{t}</span>)}
                                </div>
                              )}
                              {spot.userA.pref.note && <p className="text-[11px] text-white/55 line-clamp-2">&ldquo;{spot.userA.pref.note}&rdquo;</p>}
                              {spot.userA.pref.images.length > 0 && (
                                <div className="mt-2 flex gap-1 overflow-x-auto">
                                  {spot.userA.pref.images.map((url, i) => <img key={i} src={url} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />)}
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-[11px] text-white/35">暂无评价</p>
                          )}
                        </div>

                        {/* Friend's review */}
                        <div className="rounded-xl bg-white/5 p-2.5">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar src={spot.userB.profile.avatarUrl} name={spot.userB.profile.displayName} size="sm" />
                            <span className="text-xs font-medium text-white/80">{spot.userB.profile.displayName}</span>
                          </div>
                          {spot.userB.pref ? (
                            <>
                              <div className="flex items-center gap-1 mb-1.5">
                                <Star className={cn("h-3.5 w-3.5 fill-current", scoreColor(spot.userB.pref.overall))} />
                                <span className={cn("text-xs font-semibold", scoreColor(spot.userB.pref.overall))}>{spot.userB.pref.overall}</span>
                                {spot.userB.pref.emoji && <span className="text-sm">{spot.userB.pref.emoji}</span>}
                                {spot.userB.pref.moodTag && <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">{spot.userB.pref.moodTag}</span>}
                              </div>
                              {spot.userB.pref.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                  {spot.userB.pref.tags.slice(0, 3).map((t) => <span key={t} className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-white/50">#{t}</span>)}
                                </div>
                              )}
                              {spot.userB.pref.note && <p className="text-[11px] text-white/55 line-clamp-2">&ldquo;{spot.userB.pref.note}&rdquo;</p>}
                              {spot.userB.pref.images.length > 0 && (
                                <div className="mt-2 flex gap-1 overflow-x-auto">
                                  {spot.userB.pref.images.map((url, i) => <img key={i} src={url} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />)}
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-[11px] text-white/35">暂无评价</p>
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
