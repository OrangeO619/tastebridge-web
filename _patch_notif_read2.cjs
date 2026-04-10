const fs = require('fs');
const path = require('path');

// Patch NotificationBell component
const bellPath = path.join(__dirname, 'src/components/NotificationBell.tsx');
let bellContent = fs.readFileSync(bellPath, 'utf8');

// 1. Add cn import
if (!bellContent.includes('import { cn }')) {
  bellContent = bellContent.replace(
    '"use client";\nimport { useEffect, useRef, useState } from "react";\nimport { Bell } from "lucide-react";',
    '"use client";\nimport { useEffect, useRef, useState } from "react";\nimport { Bell } from "lucide-react";\nimport { cn } from "@/lib/utils/cn";'
  );
}

// 2. Update loadInviteNotifs to fetch all (not just unread)
bellContent = bellContent.replace(
  '      // 只获取未读的协作邀请和地图共享通知\n      const [recvRes, shareRes] = await Promise.all([\n        fetch("/api/collaboration/invites?unread=1", { headers: { "x-user-id": uid } }),',
  '      // 获取所有协作邀请（包括已读）和未读地图共享通知\n      const [recvRes, shareRes] = await Promise.all([\n        fetch("/api/collaboration/invites", { headers: { "x-user-id": uid } }),'
);

// 3. Update read field based on read_at
bellContent = bellContent.replace(
  '        read: false,\n        inviteId: x.id,',
  '        read: !!x.read_at,\n        inviteId: x.id,'
);

// 4. Update markRead to not clear notifications
bellContent = bellContent.replace(
  '  const markRead = async () => {\n    // 先在本地标记为已读\n    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));\n    if (!user?.id) return;\n    // 标记地图共享通知为已读\n    try { await fetch("/api/maps/share-notifs", { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }\n    // 标记协作邀请通知为已读\n    try { await fetch("/api/collaboration/invites?markRead=1", { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }\n    // 清空本地通知列表（刷新后不再显示已读通知）\n    setNotifs([]);\n  };',
  '  const markRead = async () => {\n    if (!user?.id) return;\n    // 标记地图共享通知为已读\n    try { await fetch("/api/maps/share-notifs", { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }\n    // 标记协作邀请通知为已读\n    try { await fetch("/api/collaboration/invites?markRead=1", { method: "PATCH", headers: { "x-user-id": user.id } }); } catch { /* noop */ }\n    // 本地标记为已读（不清空列表）\n    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));\n  };'
);

// 5. Update handleInviteAction to mark as read after action
bellContent = bellContent.replace(
  '      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: action } : x)));',
  '      // 标记为已读\n      void markSingleRead(n.id);\n      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: action, read: true } : x)));'
);

// 6. Update notification item to be clickable and show read state
bellContent = bellContent.replace(
  '                <li key={n.id} className="border-b border-white/5 px-4 py-3 last:border-0">',
  '                <li key={n.id} onClick={() => { if (!n.read) void markSingleRead(n.id); }} className={cn("border-b border-white/5 px-4 py-3 last:border-0 cursor-pointer transition", !n.read && "bg-white/5")}>'
);

// 7. Update follows filter to keep all follows
bellContent = bellContent.replace(
  '        const follows = prev.filter((n) => n.type === "follow" && !n.read);',
  '        const follows = prev.filter((n) => n.type === "follow");'
);

// 8. Remove auto markRead on open
bellContent = bellContent.replace(
  '          setOpen((o) => !o);\n          if (unread) void markRead();',
  '          setOpen((o) => !o);'
);

fs.writeFileSync(bellPath, bellContent, 'utf8');
console.log('✅ NotificationBell component fully patched');
