const fs=require("fs");
// SpotBottomCard: 自己的记录加删除按钮
const F="src/features/map/components/SpotBottomCard.tsx";
let c=fs.readFileSync(F,"utf8");
if(c.includes("handleDeletePref")){console.log("12d skip");process.exit(0);}

// 1. 加 handleDeletePref 函数（在 handleFollow 后）
const ANCHOR="const handleFollow=async";
const idx=c.indexOf(ANCHOR);
const insertAt=c.indexOf("};",idx)+2;
const DEL_FN=`
  const handleDeletePref=async(prefId:string)=>{
    if(!confirm("确定删除这条记录？"))return;
    try{
      await fetch("/api/prefs?prefId="+encodeURIComponent(prefId),{method:"DELETE",headers:{"x-user-id":userId}});
      loadPrefs();
    }catch(e){console.error(e);}
  };
`;
c=c.slice(0,insertAt)+DEL_FN+c.slice(insertAt);

// 2. 在「我」badge 后面加删除按钮（只对 p.userId===userId 的记录）
const MY_BADGE="{p.userId===userId&&<span className=\"rounded-full bg-amber-100 px-1 py-0.5 text-[9px] text-amber-600\">我</span>}";
const WITH_DEL=MY_BADGE+"{p.userId===userId&&<button onClick={()=>handleDeletePref(p.id)} className=\"ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] text-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400\">删除</button>}";
c=c.replace(MY_BADGE,WITH_DEL);

fs.writeFileSync(F,c,"utf8");
console.log("12d ok");
