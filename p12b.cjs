const fs=require("fs");
const F="src/app/profile/page.tsx";
let c=fs.readFileSync(F,"utf8");
if(!c.includes("import * as XLSX"))c=c.replace('"use client";','"use client";\nimport * as XLSX from "xlsx";');
const si=c.indexOf("const esc=");
const ej=c.indexOf("const shownName=");
if(si!==-1&&si<ej)c=c.slice(0,si)+c.slice(ej);
const EI=c.indexOf("const exportJSON=");
if(EI!==-1){const end=c.indexOf("};",EI)+2;c=c.slice(0,EI)+c.slice(end+1);}
const FN=["const exportXLSX=()=>{","  const rows=filtered.map(({pref,spot})=>({'店名':spot?.name??'','综合分':pref.overall,'口味':pref.dimensions?.taste??0,'环境':pref.dimensions?.ambiance??0,'服务':pref.dimensions?.service??0,'性价比':pref.dimensions?.value??0,'情绪':pref.emoji??'','心情标签':pref.moodTag??'','标签':(pref.tags??[]).join('|'),'备注':pref.note??'','日期':pref.createdAt?new Date(pref.createdAt).toLocaleDateString('zh-CN'):''}));","  const ws=XLSX.utils.json_to_sheet(rows);","  const wb=XLSX.utils.book_new();","  XLSX.utils.book_append_sheet(wb,ws,'探店记录');","  XLSX.writeFile(wb,'tastebridge_'+Date.now()+'.xlsx');","};"].join("\n");
c=c.replace("const shownName=",FN+"\nconst shownName=");
c=c.replace(`<button onClick={exportCSV} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/20">CSV</button>`,`<button onClick={exportXLSX} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-emerald-400 hover:bg-white/20">导出 XLSX</button>`);
c=c.replace(`<button onClick={exportJSON} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/20">JSON</button>`,'');
fs.writeFileSync(F,c,"utf8");
console.log("12b ok");
