const fs=require("fs");
const F="src/app/profile/page.tsx";
let c=fs.readFileSync(F,"utf8");
if(c.includes("编辑资料")){console.log("skip");process.exit(0);}
const OLD=`<div className="mx-auto max-w-lg px-4 pb-12 pt-4">`;
if(!c.includes(OLD)){console.error("anchor not found");process.exit(1);}
const CARD=`<div className="mb-5 flex items-center gap-4 rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">{avatarUrl?<img src={avatarUrl} alt="" className="h-16 w-16 flex-shrink-0 rounded-full object-cover ring-2 ring-amber-500/40"/>:<span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-2xl font-bold text-white">{shownName.slice(0,1).toUpperCase()}</span>}{!editMode?(<div className="flex-1 min-w-0"><p className="truncate text-lg font-bold text-white">{shownName}</p><p className="truncate text-xs text-white/40">{user?.email}</p><button onClick={()=>{setEditName(shownName);setEditMode(true);}} className="mt-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/20">编辑资料</button></div>):(<div className="flex-1 space-y-2"><input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="显示名称" className="w-full rounded-xl bg-white/10 px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none ring-1 ring-white/20 focus:ring-amber-500"/>{editErr&&<p className="text-xs text-red-400">{editErr}</p>}<div className="flex gap-2"><button onClick={saveProfile} disabled={editSaving} className="flex-1 rounded-xl bg-amber-500 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{editSaving?"保存中…":"保存"}</button><button onClick={()=>setEditMode(false)} className="rounded-xl bg-white/10 px-4 py-1.5 text-xs text-white/70">取消</button></div></div>)}</div>`;
c=c.replace(OLD,OLD+CARD);
fs.writeFileSync(F,c,"utf8");
console.log("9c ok");
