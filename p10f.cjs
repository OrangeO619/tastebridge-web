const fs=require("fs");
const F="src/app/profile/page.tsx";
let c=fs.readFileSync(F,"utf8");
if(c.includes("followingCount")){console.log("10f skip");process.exit(0);}

// 1. 加 followingCount/followersCount state
c=c.replace(
  "const[localName,setLocalName]=useState(\"\");",
  "const[localName,setLocalName]=useState(\"\");\n  const[followingCount,setFollowingCount]=useState(0);\n  const[followersCount,setFollowersCount]=useState(0);"
);

// 2. 在 prefs useEffect 后加 follows 加载
const AFTER_PREFS="})();},[]);";
const FOLLOWS_EFFECT=`
  useEffect(()=>{if(!user?.id)return;fetch("/api/follows?userId="+encodeURIComponent(user.id)).then(r=>r.json()).then((d)=>{setFollowingCount(((d).following??[]).length);setFollowersCount(((d).followers??[]).length);}).catch(()=>{});},[user?.id]);`;
c=c.replace(AFTER_PREFS,AFTER_PREFS+FOLLOWS_EFFECT);

// 3. 在 StatCard 统计行加 following/follower
const STAT_ROW="<StatCard label=\"收藏店铺\" value={items.length}/>";
c=c.replace(
  STAT_ROW,
  STAT_ROW+"{followingCount>0&&<StatCard label=\"关注\" value={followingCount}/>}{followersCount>0&&<StatCard label=\"粉丝\" value={followersCount}/>}"
);

fs.writeFileSync(F,c,"utf8");
console.log("10f ok");
