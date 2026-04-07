const fs=require('fs');
const F='src/app/profile/page.tsx';
let c=fs.readFileSync(F,'utf8');

// 删除重复的 exportXLSX
const i1=c.indexOf('const exportXLSX=');
const i2=c.indexOf('const exportXLSX=',i1+1);
if(i2!==-1){
  const end=c.indexOf('};',i2)+2;
  c=c.slice(0,i2)+c.slice(end+1);
  console.log('removed duplicate exportXLSX');
}

// 插入 handleDelete
if(!c.includes('handleDelete')){
  const DEL=`const handleDelete=async(prefId)=>{\n    if(!confirm('确定删除这条记录？'))return;\n    try{\n      await fetch('/api/prefs?prefId='+encodeURIComponent(prefId),{method:'DELETE',headers:{'x-user-id':user?.id??''}});\n      setItems(prev=>prev.filter(i=>i.pref.id!==prefId));\n    }catch(e){console.error(e);}\n  };\n  `;
  c=c.replace('const exportXLSX=',DEL+'const exportXLSX=');
  console.log('inserted handleDelete');
}

fs.writeFileSync(F,c,'utf8');
console.log('p12e ok');
