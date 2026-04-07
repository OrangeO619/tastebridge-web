const fs=require("fs");
const F="src/app/profile/page.tsx";
let c=fs.readFileSync(F,"utf8");

// 删除损坏的函数
const si=c.indexOf("const exportCSV=");
const ei=c.indexOf("const shownName=");
if(si!==-1&&ei!==-1&&si<ei){c=c.slice(0,si)+c.slice(ei);}

// 用拼接方式避免换行符字面量
const NL="'\\n'";
const FUNS="const esc=(v)=>'\"'+String(v??'').replace(/\"/g,'\"\"')+'\"';\n"
  +"const exportCSV=()=>{\n"
  +"  const cols=['店名','综合分','口味','环境','服务','性价比','情绪','心情','标签','备注','日期'];\n"
  +"  const rows=filtered.map(({pref,spot})=>[spot?.name??'',pref.overall,pref.dimensions?.taste??0,pref.dimensions?.ambiance??0,pref.dimensions?.service??0,pref.dimensions?.value??0,pref.emoji??'',pref.moodTag??'',(pref.tags??[]).join('|'),pref.note??'',pref.createdAt?new Date(pref.createdAt).toLocaleDateString('zh-CN'):'']);\n"
  +"  const lines=[cols.map(esc).join(',')].concat(rows.map(r=>r.map(esc).join(',')));\n"
  +"  const blob=new Blob(['\\uFEFF'+lines.join('\\n')],{type:'text/csv;charset=utf-8'});\n"
  +"  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tastebridge_'+Date.now()+'.csv';a.click();\n"
  +"};\n"
  +"const exportJSON=()=>{\n"
  +"  const blob=new Blob([JSON.stringify(filtered,null,2)],{type:'application/json'});\n"
  +"  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tastebridge_'+Date.now()+'.json';a.click();\n"
  +"};\n";

c=c.replace("const shownName=",FUNS+"const shownName=");
fs.writeFileSync(F,c,"utf8");
console.log("11d ok");
