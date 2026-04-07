const fs=require("fs");
const F="src/features/map/components/MapPageClient.tsx";
let c=fs.readFileSync(F,"utf8");
if(c.includes("NotificationBell")){console.log("11a skip");process.exit(0);}

// 1. 加 import
c=c.replace(
  `import type { Spot } from "@/types/spot";`,
  `import type { Spot } from "@/types/spot";
import { NotificationBell } from "@/components/NotificationBell";`
);

// 2. 加在退出按钮前
c=c.replace(
  `<button onClick={signOut} className="rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-xs text-white/70 hover:bg-black/50">退出</button>`,
  `<NotificationBell/>
            <button onClick={signOut} className="rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-xs text-white/70 hover:bg-black/50">退出</button>`
);

fs.writeFileSync(F,c,"utf8");
console.log("11a ok");
