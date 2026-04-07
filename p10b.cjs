const fs=require("fs");
const F="src/features/map/components/SpotBottomCard.tsx";
let c=fs.readFileSync(F,"utf8");
if(c.includes("viewerCount")){console.log("10b skip");process.exit(0);}

// 1. 加 viewerCount state
c=c.replace(
  "const [realtimeLive, setRealtimeLive] = useState(false);",
  "const [realtimeLive, setRealtimeLive] = useState(false);\n  const [viewerCount, setViewerCount] = useState(0);"
);

// 2. 在 Realtime useEffect 后加 Presence
const RT_END="},[spot?.id,loadPrefs]);";
if(!c.includes(RT_END)){console.error("RT anchor not found");process.exit(1);}
const PRESENCE=`

  // Presence: 显示正在查看人数
  useEffect(()=>{if(!spot?.id||!userId)return;const sb=createSupabaseBrowser();const pc=sb.channel("presence-"+spot.id,{config:{presence:{key:userId}}}).on("presence",{event:"sync"},()=>{setViewerCount(Object.keys(pc.presenceState()).length);}).subscribe(async(s)=>{if(s==="SUBSCRIBED")await pc.track({userId,ts:Date.now()});});return()=>{void sb.removeChannel(pc);setViewerCount(0);};},[spot?.id,userId]);`;
c=c.replace(RT_END,RT_END+PRESENCE);

fs.writeFileSync(F,c,"utf8");
console.log("10b ok");
