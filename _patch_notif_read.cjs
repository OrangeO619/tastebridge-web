const fs = require('fs');
const path = require('path');

// Patch share-notifs route
const shareNotifsPath = path.join(__dirname, 'src/app/api/maps/share-notifs/route.ts');
let shareNotifsContent = fs.readFileSync(shareNotifsPath, 'utf8');

shareNotifsContent = shareNotifsContent.replace(
  'export async function PATCH(request: Request) {\n  const userId = request.headers.get("x-user-id")?.trim();\n  if (!userId) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });\n\n  const db = createSupabaseAdmin();\n  const { error } = await db\n    .from("map_share_notifs")\n    .update({ read_at: new Date().toISOString() })\n    .eq("shared_with", userId)\n    .is("read_at", null);\n\n  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });\n\n  return NextResponse.json({ ok: true });\n}',
  'export async function PATCH(request: Request) {\n  const userId = request.headers.get("x-user-id")?.trim();\n  if (!userId) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });\n\n  const sp = new URL(request.url).searchParams;\n  const notifId = sp.get("notifId");\n\n  const db = createSupabaseAdmin();\n\n  // 如果指定了 notifId，只标记单条\n  if (notifId) {\n    const { error } = await db\n      .from("map_share_notifs")\n      .update({ read_at: new Date().toISOString() })\n      .eq("id", Number(notifId))\n      .eq("shared_with", userId)\n      .is("read_at", null);\n\n    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });\n    return NextResponse.json({ ok: true });\n  }\n\n  // 否则标记所有未读\n  const { error } = await db\n    .from("map_share_notifs")\n    .update({ read_at: new Date().toISOString() })\n    .eq("shared_with", userId)\n    .is("read_at", null);\n\n  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });\n\n  return NextResponse.json({ ok: true });\n}'
);

fs.writeFileSync(shareNotifsPath, shareNotifsContent, 'utf8');
console.log('✅ share-notifs route patched');

// Patch NotificationBell component
const bellPath = path.join(__dirname, 'src/components/NotificationBell.tsx');
let bellContent = fs.readFileSync(bellPath, 'utf8');

// Update loadInviteNotifs to fetch all (not just unread)
bellContent = bellContent.replace(
  '  const loadInviteNotifs = async (uid: string) => {\n    try {\n      // 只获取未读的协作邀请和地图共享通知\n      const [recvRes, shareRes] = await Promise.all([\n        fetch("/api/collaboration/invites?unread=1", { headers: { "x-user-id": uid } }),\n        fetch("/api/maps/share-notifs", { headers: { "x-user-id": uid } }),\n      ]);',
  '  const loadInviteNotifs = async (uid: string) => {\n    try {\n      // 获取所有协作邀请和地图共享通知（包括已读）\n      const [recvRes, shareRes] = await Promise.all([\n        fetch("/api/collaboration/invites", { headers: { "x-user-id": uid } }),\n        fetch("/api/maps/share-notifs", { headers: { "x-user-id": uid } }),\n      ]);'
);

// Update read field based on read_at
bellContent = bellContent.replace(
  '      const recvList: InviteNotif[] = (recv.invites ?? []).map((x) => ({\n        id: `recv-${x.id}`,\n        type: "invite_received",\n        text: `${x.inviter_id.slice(0, 6)}… 邀请你协作记录「${x.spots?.name ?? "店铺"}」`,\n        time: new Date(x.created_at).getTime(),\n        read: false,\n        inviteId: x.id,\n        spotId: x.spot_id,\n        inviterId: x.inviter_id,\n        status: x.status,\n      }));',
  '      const recvList: InviteNotif[] = (recv.invites ?? []).map((x) => ({\n        id: `recv-${x.id}`,\n        type: "invite_received",\n        text: `${x.inviter_id.slice(0, 6)}… 邀请你协作记录「${x.spots?.name ?? "店铺"}」`,\n        time: new Date(x.created_at).getTime(),\n        read: !!x.read_at,\n        inviteId: x.id,\n        spotId: x.spot_id,\n        inviterId: x.inviter_id,\n        status: x.status,\n      }));'
);

bellContent = bellContent.replace(
  '      setNotifs((prev) => {\n        const follows = prev.filter((n) => n.type === "follow" && !n.read);\n        return [...recvList, ...shareList, ...follows].sort((a, b) => b.time - a.time).slice(0, 40);\n      });',
  '      setNotifs((prev) => {\n        const follows = prev.filter((n) => n.type === "follow");\n        return [...recvList, ...shareList, ...follows].sort((a, b) => b.time - a.time).slice(0, 40);\n      });'
);

// Update markRead to not clear notifications
bellContent = bellContent.replace(
  '  const markRead = async () => {\n    // 先在本地标记为已读\n    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));\n    if (!user?.id) return;\n    // 标记地图共享通知为已读\n    try { await fetch("/api/maps/share-notifs", { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }\n    // 标记协作邀请通知为已读\n    try { await fetch("/api/collaboration/invites?markRead=1", { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }\n    // 清空本地通知列表（刷新后不再显示已读通知）\n    setNotifs([]);\n  };',
  '  const markRead = async () => {\n    if (!user?.id) return;\n    // 标记地图共享通知为已读\n    try { await fetch("/api/maps/share-notifs", { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }\n    // 标记协作邀请通知为已读\n    try { await fetch("/api/collaboration/invites?markRead=1", { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }\n    // 本地标记为已读\n    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));\n  };'
);

// Add markSingleRead function
bellContent = bellContent.replace(
  '  const markRead = async () => {',
  '  const markSingleRead = async (notifId: string) => {\n    if (!user?.id) return;\n    // 根据通知类型调用对应的 API\n    if (notifId.startsWith("recv-")) {\n      const inviteId = notifId.replace("recv-", "");\n      try { await fetch(`/api/collaboration/invites?markRead=1&inviteId=${inviteId}`, { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }\n    } else if (notifId.startsWith("share-")) {\n      const shareId = notifId.replace("share-", "");\n      try { await fetch(`/api/maps/share-notifs?notifId=${shareId}`, { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }\n    }\n    // 本地标记为已读\n    setNotifs((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));\n  };\n\n  const markRead = async () => {'
);

// Update handleInviteAction to mark as read after action
bellContent = bellContent.replace(
  '  const handleInviteAction = async (n: InviteNotif, action: "accepted" | "rejected") => {\n    if (!user?.id) return;\n    try {\n      const r = await fetch("/api/collaboration/invites", {\n        method: "PATCH",\n        headers: { "Content-Type": "application/json", "x-user-id": user.id },\n        body: JSON.stringify({ inviteId: n.inviteId, action }),\n      });\n      const d = (await r.json()) as { spotId?: string; invitedBy?: string };\n      if (!r.ok) return;\n\n      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: action } : x)));',
  '  const handleInviteAction = async (n: InviteNotif, action: "accepted" | "rejected") => {\n    if (!user?.id) return;\n    try {\n      const r = await fetch("/api/collaboration/invites", {\n        method: "PATCH",\n        headers: { "Content-Type": "application/json", "x-user-id": user.id },\n        body: JSON.stringify({ inviteId: n.inviteId, action }),\n      });\n      const d = (await r.json()) as { spotId?: string; invitedBy?: string };\n      if (!r.ok) return;\n\n      // 标记为已读\n      void markSingleRead(n.id);\n\n      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: action } : x)));'
);

// Update notification item click handler
bellContent = bellContent.replace(
  '              {notifs.map((n) => (\n                <li key={n.id} className="border-b border-white/5 px-4 py-3 last:border-0">',
  '              {notifs.map((n) => (\n                <li key={n.id} onClick={() => { if (!n.read) void markSingleRead(n.id); }} className={cn("border-b border-white/5 px-4 py-3 last:border-0 cursor-pointer", !n.read && "bg-white/5")}>'
);

// Add cn import
bellContent = bellContent.replace(
  '"use client";\nimport { useEffect, useRef, useState } from "react";\nimport { Bell } from "lucide-react";',
  '"use client";\nimport { useEffect, useRef, useState } from "react";\nimport { Bell } from "lucide-react";\nimport { cn } from "@/lib/utils/cn";'
);

fs.writeFileSync(bellPath, bellContent, 'utf8');
console.log('✅ NotificationBell component patched');
