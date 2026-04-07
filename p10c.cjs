const fs=require("fs");
const F="src/features/map/components/SpotBottomCard.tsx";
let c=fs.readFileSync(F,"utf8");
if(c.includes("+关注")){console.log("10c skip");process.exit(0);}

// 1. realtimeLive 指示 + viewerCount（在「人评价」后）
const EVAL="{summary.count} 人评价";
const EVAL_NEW=EVAL+"{realtimeLive&&<span className=\"ml-2 inline-flex items-center gap-0.5 text-[10px] text-emerald-500\"><span className=\"h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500\"/>{viewerCount>1?viewerCount+'人在看':'实时'}</span>}";
c=c.replace(EVAL,EVAL_NEW);

// 2. 关注按钮（在「我」badge 后）
const MY_BADGE="{p.userId===userId&&<span className=\"rounded-full bg-amber-100 px-1 py-0.5 text-[9px] text-amber-600\">我</span>}";
const FOLLOW_BTN=MY_BADGE+"{p.userId!==userId&&<button onClick={()=>handleFollow(p.userId)} disabled={followPending===p.userId} className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] transition ${followingSet.has(p.userId)?'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300':'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300'}`}>{followPending===p.userId?'…':followingSet.has(p.userId)?'已关注':'+关注'}</button>}";
c=c.replace(MY_BADGE,FOLLOW_BTN);

fs.writeFileSync(F,c,"utf8");
console.log("10c ok");
