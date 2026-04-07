// p8c: profile page - 使用 useAuth + 登出按钮
import fs from 'fs';
const F='src/app/profile/page.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('useAuth')){console.log('8c skip');process.exit(0);}

// 1. 加 useAuth import
c=c.replace(
  'import { DEV_USER_ID } from "@/lib/constants/user";',
  'import { useAuth } from "@/lib/auth/AuthProvider";'
);

// 2. 在 useEffect 前加 useAuth
c=c.replace(
  'const[items,setItems]',
  'const{user,displayName,signOut}=useAuth();\n  const[items,setItems]'
);

// 3. 替换 DEV_USER_ID in fetch
c=c.replace(
  'encodeURIComponent(DEV_USER_ID)',
  'encodeURIComponent(user?.id??"")'
);

// 4. 把标题旁边加登出按钮，把「我的味觉日记」后面加用户名
c=c.replace(
  '<h1 className="flex-1 text-base font-semibold text-white">我的味觉日记</h1>',
  `<h1 className="flex-1 text-base font-semibold text-white">{displayName} 的味觉日记</h1>
      <button onClick={signOut} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/20">登出</button>`
);

fs.writeFileSync(F,c,'utf8');
console.log('8c ok');
