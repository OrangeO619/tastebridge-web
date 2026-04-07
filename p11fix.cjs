const fs=require("fs");
const F="src/app/profile/page.tsx";
let c=fs.readFileSync(F,"utf8");

// 修复：加 user?.id 依赖 + guard
c=c.replace(
  `useEffect(()=>{(async()=>{try{const res=await fetch(\`/api/prefs?userId=\${encodeURIComponent(user?.id??"")}\`);const data=await res.json() as{items?:PrefItem[];error?:string};if(!res.ok)throw new Error(data.error??"加载失败");setItems(data.items??[]);}catch(e){setError(e instanceof Error?e.message:"加载失败");}finally{setLoading(false);}})();},[]);`,
  `useEffect(()=>{if(!user?.id){setLoading(false);return;}(async()=>{try{const res=await fetch(\`/api/prefs?userId=\${encodeURIComponent(user.id)}\`);const data=await res.json() as{items?:PrefItem[];error?:string};if(!res.ok)throw new Error(data.error??"加载失败");setItems(data.items??[]);}catch(e){setError(e instanceof Error?e.message:"加载失败");}finally{setLoading(false);}})();},[user?.id]);`
);

fs.writeFileSync(F,c,"utf8");
console.log("fix ok");
