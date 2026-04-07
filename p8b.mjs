// p8b: MapPageClient - 加用户信息 + 登出按钮
import fs from 'fs';
const F='src/features/map/components/MapPageClient.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('useAuth')){console.log('8b skip');process.exit(0);}

// 1. 加 useAuth import
c=c.replace(
  'import type { Spot } from "@/types/spot";',
  'import type { Spot } from "@/types/spot";\r\nimport { useAuth } from "@/lib/auth/AuthProvider";'
);

// 2. 在 MapPageClient 组件开头加 auth
c=c.replace(
  'const [spots, setSpots]',
  'const { displayName, avatarUrl, signOut } = useAuth();\r\n  const [spots, setSpots]'
);

// 3. 替换 header 中「我的记录」链接旁，加头像+用户名+登出
c=c.replace(
  '<span className="text-lg font-semibold tracking-tight text-white">TasteBridge</span>\r\n            <a href="/profile" className="rounded-full border border-white/35 bg-black/35 px-2.5 py-1 text-xs text-white/95 hover:bg-black/55">我的记录</a>',
  `<span className="text-lg font-semibold tracking-tight text-white">TasteBridge</span>
            <a href="/profile" className="flex items-center gap-1.5 rounded-full border border-white/35 bg-black/35 px-2.5 py-1 text-xs text-white/95 hover:bg-black/55">
              {avatarUrl ? (<img src={avatarUrl} alt="" className="h-4 w-4 rounded-full object-cover"/>) : (<span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold">{displayName.slice(0,1).toUpperCase()}</span>)}
              {displayName}
            </a>
            <button onClick={signOut} className="rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-xs text-white/70 hover:bg-black/50">登出</button>`
);

fs.writeFileSync(F,c,'utf8');
console.log('8b ok');
