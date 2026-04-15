"use client";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils/cn";

type FollowNotif = { id: string; type: "follow"; text: string; time: number; read: boolean };
type InviteNotif = {
  id: string;
  type: "invite_received" | "invite_sent";
  text: string;
  time: number;
  read: boolean;
  inviteId: number;
  spotId: string;
  inviterId: string;
  status: "pending" | "accepted" | "rejected";
};
type ShareNotif = { id: string; type: "map_share"; text: string; time: number; read: boolean };
type Notif = FollowNotif | InviteNotif | ShareNotif;

export function NotificationBell() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [collabPendingHint, setCollabPendingHint] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.read).length;
  const badgeCount = unread + collabPendingHint;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const n = Number(window.localStorage.getItem("tb_collab_pending") ?? "0");
    setCollabPendingHint(Number.isFinite(n) ? Math.max(0, n) : 0);
    const onPending = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      setCollabPendingHint(typeof detail === "number" ? Math.max(0, detail) : 0);
    };
    window.addEventListener("tb-collab-pending", onPending as EventListener);
    return () => window.removeEventListener("tb-collab-pending", onPending as EventListener);
  }, []);

  const loadInviteNotifs = async (uid: string) => {
    try {
      // 获取协作邀请（含已读）与地图共享通知
      const [recvRes, shareRes] = await Promise.all([
        fetch("/api/collaboration/invites", { headers: { "x-user-id": uid } }),
        fetch("/api/maps/share-notifs", { headers: { "x-user-id": uid } }),
      ]);

      const recv = (await recvRes.json()) as {
        invites?: Array<{ id: number; spot_id: string; inviter_id: string; created_at: string; status: "pending" | "accepted" | "rejected"; read_at?: string | null; spots?: { name?: string } | null }>;
      };
      const shared = (await shareRes.json()) as {
        items?: Array<{ id: number; owner_id: string; permission: "view" | "edit"; created_at: string; read_at?: string | null }>;
      };

      const recvList: InviteNotif[] = (recv.invites ?? []).map((x) => ({
        id: `recv-${x.id}`,
        type: "invite_received",
        text: `${x.inviter_id.slice(0, 6)}… 邀请你协作记录「${x.spots?.name ?? "店铺"}」`,
        time: new Date(x.created_at).getTime(),
        read: !!x.read_at,
        inviteId: x.id,
        spotId: x.spot_id,
        inviterId: x.inviter_id,
        status: x.status,
      }));

      const shareList: ShareNotif[] = (shared.items ?? []).map((x) => ({
        id: `share-${x.id}`,
        type: "map_share",
        text: `${x.owner_id.slice(0, 6)}… 向你共享了地图（${x.permission === "edit" ? "可编辑" : "仅查看"}）`,
        time: new Date(x.created_at).getTime(),
        read: !!x.read_at,
      }));

      setNotifs((prev) => {
        const follows = prev.filter((n) => n.type === "follow");
        return [...recvList, ...shareList, ...follows].sort((a, b) => b.time - a.time).slice(0, 40);
      });
    } catch {
      // noop
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    void loadInviteNotifs(user.id);

    const timer = window.setInterval(() => {
      void loadInviteNotifs(user.id);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [user?.id]);

  // 监听关注事件
  useEffect(() => {
    if (!user?.id) return;
    const sb = createSupabaseBrowser();
    const ch = sb
      .channel("notif-follows-" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "follows", filter: "following_id=eq." + user.id },
        (payload: { new: Record<string, unknown> }) => {
          const followerId = (payload.new as { follower_id: string }).follower_id;
          const notif: FollowNotif = {
            id: "f-" + String(Date.now()),
            type: "follow",
            text: `用户 ${followerId.slice(0, 6)}… 关注了你`,
            time: Date.now(),
            read: false,
          };
          setNotifs((prev) => [notif, ...prev].slice(0, 40));
          if (Notification.permission === "granted") {
            new Notification("TasteBridge", { body: notif.text, icon: "/favicon.ico" });
          }
        },
      )
      .subscribe();

    const chInv = sb
      .channel("notif-invites-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collab_invites" },
        () => {
          void loadInviteNotifs(user.id);
        },
      )
      .subscribe();

    if (Notification.permission === "default") Notification.requestPermission();
    return () => {
      void sb.removeChannel(ch);
      void sb.removeChannel(chInv);
    };
  }, [user?.id]);

  const markSingleRead = async (notifId: string) => {
    if (!user?.id) return;
    // 根据通知类型调用对应的 API
    if (notifId.startsWith("recv-")) {
      const inviteId = notifId.replace("recv-", "");
      try { await fetch(`/api/collaboration/invites?markRead=1&inviteId=${inviteId}`, { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }
    } else if (notifId.startsWith("share-")) {
      const shareId = notifId.replace("share-", "");
      try { await fetch(`/api/maps/share-notifs?notifId=${shareId}`, { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }
    }
    // 本地标记为已读
    setNotifs((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
  };

  const markRead = async () => {
    if (!user?.id) return;
    // 标记地图共享通知为已读
    try { await fetch("/api/maps/share-notifs", { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }
    // 标记协作邀请通知为已读
    try { await fetch("/api/collaboration/invites?markRead=1", { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }
    // 本地标记为已读（不清空列表）
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleInviteAction = async (n: InviteNotif, action: "accepted" | "rejected") => {
    if (!user?.id) return;
    try {
      const r = await fetch("/api/collaboration/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ inviteId: n.inviteId, action }),
      });
      const d = (await r.json()) as { spotId?: string; invitedBy?: string };
      if (!r.ok) return;

      // 标记为已读
      void markSingleRead(n.id);
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: action, read: true } : x)));

      if (action === "accepted" && d.spotId) {
        window.location.assign(`/?spotId=${encodeURIComponent(d.spotId)}&ref=${encodeURIComponent(d.invitedBy ?? n.inviterId)}`);
      }
    } catch {
      // noop
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
        }}
        className="relative flex cursor-pointer h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50"
      >
        <Bell className="h-4 w-4" />
        {badgeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-white/10">
          <div className="border-b border-white/10 px-4 py-2.5">
            <p className="text-xs font-semibold text-white">通知</p>
          </div>
          {notifs.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-white/40">暂无通知</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifs.map((n) => (
                <li key={n.id} onClick={() => { if (!n.read) void markSingleRead(n.id); }} className={cn("border-b border-white/5 px-4 py-3 last:border-0 cursor-pointer transition", !n.read && "bg-white/5")}>
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${n.type === "invite_received" ? "bg-violet-400" : n.type === "invite_sent" ? "bg-sky-400" : n.type === "map_share" ? "bg-emerald-400" : "bg-amber-500"}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-white/90">{n.text}</p>
                      <p className="mt-0.5 text-[10px] text-white/40">
                        {new Date(n.time).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  {(n.type === "invite_received" || n.type === "invite_sent") ? (
                    <p className="mt-1 pl-4 text-[11px] text-white/60">状态：{n.status === "pending" ? "待处理" : n.status === "accepted" ? "已接受" : "已拒绝"}</p>
                  ) : null}

                  {n.type === "invite_received" && n.status === "pending" ? (
                    <div className="mt-2 flex gap-2 pl-4">
                      <button onClick={() => void handleInviteAction(n, "accepted")} className="rounded-md bg-violet-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-violet-400">接受并填写</button>
                      <button onClick={() => void handleInviteAction(n, "rejected")} className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/20">拒绝</button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
