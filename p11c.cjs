const fs=require("fs");
const F="src/app/profile/page.tsx";
let c=fs.readFileSync(F,"utf8");

// 删除损坏的 exportCSV/exportJSON，重新插入
const BAD_START="const exportCSV=";
const BAD_END="const shownName=";
const si=c.indexOf(BAD_START);
const ei=c.indexOf(BAD_END);
if(si!==-1&&ei!==-1&&si<ei){
  c=c.slice(0,si)+c.slice(ei);
  console.log("removed old export fns");
}

// 重新插入正确版本
const FUNS=[
  "const exportCSV=()=>{",
  "  const headers=['店名','综合分','口味','环境','服务','性价比','情绪','心情','标签','备注','日期'];",
  "  const escape=(v)=>'\"'+String(v).replace(/\"/g,'\"\"')+'\"';",
  "  const rows=filtered.map(({pref,spot})=>[",
  "    spot?.name??'',pref.overall,pref.dimensions?.taste??0,pref.dimensions?.ambiance??0,",
  "    pref.dimensions?.service??0,pref.dimensions?.value??0,pref.emoji??'',pref.moodTag??'',",
  "    (pref.tags??[]).join('|'),pref.note??'',",
  "    pref.createdAt?new Date(pref.createdAt).toLocaleDateString('zh-CN'):'',",
  "  ]);",
  "  const csv=['\uFEFF'+headers.map(escape).join(',')].concat(rows.map(r=>r.map(escape).join(','))).join('\r\n');",
  "  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));",
  "  a.download='tastebridge_'+Date.now()+'.csv';a.click();",
  "};",
  "const exportJSON=()=>{",
  "  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(filtered,null,2)],{type:'application/json'}));",
  "  a.download='tastebridge_'+Date.now()+'.json';a.click();",
  "};",
].join('\n');
c=c.replace("const shownName=",FUNS+"\nconst shownName=");

fs.writeFileSync(F,c,"utf8");
console.log("11c ok");
