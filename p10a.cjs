const fs=require("fs");
const F="src/features/map/components/SpotBottomCard.tsx";
let c=fs.readFileSync(F,"utf8");
if(c.includes("handleFollow")){console.log("10a skip");process.exit(0);}

// 1. 加 viewerCount state
c=c.replace(
  "const [realtimeLive, setRealtimeLive] = useState(false);",
  "const [realtimeLive, setRealtimeLive] = useState(false);\n  const [viewerCount, setViewerCount] = useState(0);"
);

// 2. Presence channel（在 Realtime useEffect 后面加）
const AFTER_RT="},[spot?.id,loadPrefs]);";
const PRESENCE=`
  // Presence
  useEffect(()=>{if(!spot?.id||!userId)return;const sb=createSupabaseBrowser();const pc=sb.channel("presence-"+spot.id,{config:{presence:{key:userId}}}).on("presence",{event:"sync"},()=>{setViewerCount(Object.keys(pc.presenceState()).length);}).subscribe(async(s)=>{if(s==="SUBSCRIBED")await pc.track({userId,ts:Date.now()});});return()=>{void sb.removeChannel(pc);setViewerCount(0);};},[spot?.id,userId]);`;
c=c.replace(AFTER_RT, AFTER_RT+PRESENCE);

// 3. handleFollow function（在 return 之前）
const BEFORE_RETURN="return (\n    <>";
const HF=`const handleFollow=async(targetId)=>{if(followPending!==null)return;setFollowPending(targetId);const isFollowing=followingSet.has(targetId);try{if(isFollowing){await fetch("/api/follows?targetId="+encodeURIComponent(targetId),{method:"DELETE",headers:{"x-user-id":userId}});}else{await fetch("/api/follows",{method:"POST",headers:{"Content-Type":"application/json","x-user-id":userId},body:JSON.stringify({targetId})});}setFollowingSet(prev=>{const s=new Set(prev);isFollowing?s.delete(targetId):s.add(targetId);return s;});}catch(e){console.error(e);}finally{setFollowPending(null);}};\n  `;
c=c.replace(BEFORE_RETURN, HF+BEFORE_RETURN);

fs.writeFileSync(F,c,"utf8");
console.log("10a ok");
