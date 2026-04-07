import fs from 'fs';
const F='src/app/profile/page.tsx';
let c=fs.readFileSync(F,'utf8');
if(c.includes('editMode')){console.log('9b skip');process.exit(0);}

// 1. destructure avatarUrl
c=c.replace('const{user,displayName,signOut}=useAuth();','const{user,displayName,avatarUrl,signOut}=useAuth();');

// 2. edit states
c=c.replace(
  'const[items,setItems]=useState<PrefItem[]>([]);',
  'const[items,setItems]=useState<PrefItem[]>([]);\n  const[editMode,setEditMode]=useState(false);\n  const[editName,setEditName]=useState("");\n  const[editSaving,setEditSaving]=useState(false);\n  const[editErr,setEditErr]=useState<string|null>(null);\n  const[localName,setLocalName]=useState("");'
);

// 3. saveProfile before return
const RA='return(<div className="min-h-dvh';
c=c.replace(RA,
  'const shownName=localName||displayName;\n  const saveProfile=async()=>{if(!user?.id)return;setEditSaving(true);setEditErr(null);try{const r=await fetch("/api/profiles",{method:"PATCH",headers:{"Content-Type":"application/json","x-user-id":user.id},body:JSON.stringify({displayName:editName.trim()||shownName})});if(!r.ok)throw new Error("保存失败");setLocalName(editName.trim()||shownName);setEditMode(false);}catch(e){setEditErr(e instanceof Error?e.message:"保存失败");}finally{setEditSaving(false);}};\n  '+RA
);

// 4. profile card before stats
const SA='{!loading&&!error&&(<div className="mb-4 flex justify-center gap-4">';
const PC='<div className="mb-5 flex items-center gap-4 rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">'
  +'{avatarUrl?<img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-amber-500/40"/>:<span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-2xl font-bold text-white">{shownName.slice(0,1).toUpperCase()}</span>}'
  +'{!editMode?(<div className="flex-1 min-w-0"><p className="truncate text-lg font-bold text-white">{shownName}</p><p className="truncate text-xs text-white/40">{user?.email}</p><button onClick={()=>{setEditName(shownName);setEditMode(true);}} className="mt-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/20">编辑资料</button></div>)'
  +':(<div className="flex-1 space-y-2"><input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="显示名称" className="w-full rounded-xl bg-white/10 px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none ring-1 ring-white/20 focus:ring-amber-500"/>{editErr&&<p className="text-xs text-red-400">{editErr}</p>}<div className="flex gap-2"><button onClick={saveProfile} disabled={editSaving} className="flex-1 rounded-xl bg-amber-500 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{editSaving?"保存中…":"保存"}</button><button onClick={()=>setEditMode(false)} className="rounded-xl bg-white/10 px-4 py-1.5 text-xs text-white/70">取消</button></div></div>)}'
  +'</div>'
  +SA;
c=c.replace(SA,PC);

fs.writeFileSync(F,c,'utf8');
console.log('9b ok');
