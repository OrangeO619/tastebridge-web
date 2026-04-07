const fs=require("fs");
const F="src/app/profile/page.tsx";
let c=fs.readFileSync(F,"utf8");
if(c.includes("exportCSV")){console.log("11b skip");process.exit(0);}

// 1. 加 exportCSV + exportJSON 函数（在 shownName 前）
const BEFORE="const shownName=";
const FUNS=`const exportCSV=()=>{
  const rows=[["店名","综合分","口味","环境","服务","性价比","情绪","心情标签","标签","备注","日期"]];
  filtered.forEach(({pref,spot})=>{
    rows.push([spot?.name??"",String(pref.overall),String(pref.dimensions?.taste??0),String(pref.dimensions?.ambiance??0),String(pref.dimensions?.service??0),String(pref.dimensions?.value??0),pref.emoji??"",pref.moodTag??"",( pref.tags??[]).join("|"),pref.note??"",pref.createdAt?new Date(pref.createdAt).toLocaleDateString("zh-CN"):""]);
  });
  const csv=rows.map(r=>r.map(v=>\`"\${String(v).replace(/"/g,'""')}"\`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));a.download=\`tastebridge_\${Date.now()}.csv\`;a.click();
};
const exportJSON=()=>{
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(filtered,null,2)],{type:"application/json"}));a.download=\`tastebridge_\${Date.now()}.json\`;a.click();
};
`;
c=c.replace(BEFORE,FUNS+BEFORE);

// 2. 加导出按钮（在退出按钮后）
c=c.replace(
  `<button onClick={signOut} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/20">退出</button>`,
  `<button onClick={signOut} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/20">退出</button>
      <button onClick={exportCSV} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/20">CSV</button>
      <button onClick={exportJSON} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/20">JSON</button>`
);

fs.writeFileSync(F,c,"utf8");
console.log("11b ok");
