"use client";
import * as XLSX from "xlsx";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import Link from "next/link";
import { ArrowLeft, ImageDown, MapPin, Search, Sparkles, Star, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { PrefRecord } from "@/types/pref";
import type { Spot } from "@/types/spot";
type PrefItem = { pref: PrefRecord; spot: Spot | null };
function scoreColor(v:number){if(v>=4.5)return"#ef4444";if(v>=3.5)return"#f97316";if(v>=2.5)return"#eab308";return"#94a3b8";}
function ScoreBadge({value}:{value:number}){return(<span style={{background:scoreColor(value)}}className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow">{value}</span>);}
function MiniDims({dims}:{dims:PrefRecord["dimensions"]}){if(!dims)return null;const e=([["口味",dims.taste],["环境",dims.ambiance],["服务",dims.service],["性价比",dims.value]]as[string,number][]).filter(([,v])=>v>0);if(!e.length)return null;return(<div className="flex flex-wrap gap-x-3 px-4 pb-2">{e.map(([l,v])=>(<span key={l}className="text-[11px] text-white/50">{l}<span className="ml-0.5 font-medium text-white/70">{v}</span><span className="text-amber-400/70">★</span></span>))}</div>);}
function StatCard({label,value}:{label:string;value:string|number}){return(<div className="flex flex-col items-center rounded-2xl bg-white/10 px-5 py-3"><span className="text-2xl font-bold text-white">{value}</span><span className="mt-0.5 text-xs text-white/65">{label}</span></div>);}
const SCORE_F=[{label:"全部",min:0},{label:"≥3",min:3},{label:"≥4",min:4},{label:"≥4.5",min:4.5}];
export default function ProfilePage(){
  const{user,displayName,avatarUrl,signOut}=useAuth();
  const[items,setItems]=useState<PrefItem[]>([]);
  const[editMode,setEditMode]=useState(false);
  const[editName,setEditName]=useState("");
  const[editSaving,setEditSaving]=useState(false);
  const[editErr,setEditErr]=useState<string|null>(null);
  const[localName,setLocalName]=useState("");
  const[followingCount,setFollowingCount]=useState(0);
  const[followersCount,setFollowersCount]=useState(0);
  const[localAvatarUrl,setLocalAvatarUrl]=useState<string|null>(null);
  const[uploadingAvatar,setUploadingAvatar]=useState(false);
  const avatarInputRef=useRef<HTMLInputElement>(null);const monthlyCardRef=useRef<HTMLDivElement>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState<string|null>(null);
  const[search,setSearch]=useState("");
  const[minScore,setMinScore]=useState(0);
  const[filterEmoji,setFilterEmoji]=useState<string|null>(null);
  const[filterTag,setFilterTag]=useState<string|null>(null);const[friendQuery,setFriendQuery]=useState("");const[friendResults,setFriendResults]=useState<Array<{id:string;displayName:string|null;avatarUrl:string|null}>>([]);const[friendLoading,setFriendLoading]=useState(false);const[friendError,setFriendError]=useState<string|null>(null);const[followingIds,setFollowingIds]=useState<string[]>([]);const[followBusy,setFollowBusy]=useState<string|null>(null);const[followMsg,setFollowMsg]=useState<string|null>(null);const[sharedMaps,setSharedMaps]=useState<Array<{id:number;ownerId:string;permission:"view"|"edit";ownerProfile:{id:string;display_name?:string|null;avatar_url?:string|null}|null}>>([]);const[sharedByMe,setSharedByMe]=useState<Array<{id:number;sharedWith:string;permission:"view"|"edit";sharedWithProfile:{id:string;display_name?:string|null;avatar_url?:string|null}|null}>>([]);const[followingOptions,setFollowingOptions]=useState<Array<{id:string;displayName:string|null;avatarUrl:string|null}>>([]);const[shareTarget,setShareTarget]=useState("");const[sharePermission,setSharePermission]=useState<"view"|"edit">("view");const[shareMsg,setShareMsg]=useState<string|null>(null);const[shareLoading,setShareLoading]=useState(false);const[friendshipOpen,setFriendshipOpen]=useState(false);const[friendshipLoading,setFriendshipLoading]=useState(false);const[friendshipErr,setFriendshipErr]=useState<string|null>(null);const[friendshipSummary,setFriendshipSummary]=useState<any>(null);const[monthlyOpen,setMonthlyOpen]=useState(false);const[monthlyLoading,setMonthlyLoading]=useState(false);const[monthlySummary,setMonthlySummary]=useState<null|{period:string;totalVisits:number;avgRating:number;topSpots:Array<{id:string;name:string;avg:number}>;topMoodTags:string[];topTags:string[];insight:string;musicSearchQuery:string;musicReason:string}>(null);const[monthlyErr,setMonthlyErr]=useState<string|null>(null);
  useEffect(()=>{if(!user?.id){setLoading(false);return;}(async()=>{try{const res=await fetch(`/api/prefs?userId=${encodeURIComponent(user.id)}`);const data=await res.json() as{items?:PrefItem[];error?:string};if(!res.ok)throw new Error(data.error??"加载失败");setItems(data.items??[]);}catch(e){setError(e instanceof Error?e.message:"加载失败");}finally{setLoading(false);}})();},[user?.id]);
  useEffect(()=>{if(!user?.id)return;fetch("/api/follows?userId="+encodeURIComponent(user.id)).then(r=>r.json()).then((d)=>{const following=((d).following??[]) as string[];setFollowingCount(following.length);setFollowersCount(((d).followers??[]).length);setFollowingOptions(((d).followingProfiles??[]) as Array<{id:string;displayName:string|null;avatarUrl:string|null}>);setFollowingIds(following);}).catch(()=>{});},[user?.id]);useEffect(()=>{if(!user?.id)return;fetch(`/api/maps/${encodeURIComponent(user.id)}/shared`,{headers:{"x-user-id":user.id}}).then(r=>r.json()).then((d)=>setSharedMaps(d.items??[])).catch(()=>setSharedMaps([]));},[user?.id]);useEffect(()=>{if(!user?.id)return;fetch(`/api/maps/share`,{headers:{"x-user-id":user.id}}).then(r=>r.json()).then((d)=>setSharedByMe(d.items??[])).catch(()=>setSharedByMe([]));},[user?.id]);
  const allEmojis=useMemo(()=>[...new Set(items.map(i=>i.pref.emoji).filter(Boolean) as string[])],[items]);
  const allTags=useMemo(()=>[...new Set(items.flatMap(i=>i.pref.tags??[]))].slice(0,12),[items]);
  const filtered=useMemo(()=>items.filter(({pref,spot})=>{if(minScore>0&&pref.overall<minScore)return false;if(filterEmoji&&pref.emoji!==filterEmoji)return false;if(filterTag&&!(pref.tags??[]).includes(filterTag))return false;if(search&&!(spot?.name??"").includes(search))return false;return true;}),[items,minScore,filterEmoji,filterTag,search]);
  const avgScore=items.length>0?Math.round(items.reduce((s,i)=>s+i.pref.overall,0)/items.length*10)/10:null;
  const hasFilter=minScore>0||!!filterEmoji||!!filterTag||!!search;
  const handleDelete=async(prefId:string)=>{
    if(!confirm('确定删除这条记录？'))return;
    try{
      await fetch('/api/prefs?prefId='+encodeURIComponent(prefId),{method:'DELETE',headers:{'x-user-id':user?.id??''}});
      setItems(prev=>prev.filter(i=>i.pref.id!==prefId));
    }catch(e){console.error(e);}
  };
  const exportXLSX=()=>{
  const rows=filtered.map(({pref,spot})=>({
    '店名':spot?.name??'','综合分':pref.overall,'口味':pref.dimensions?.taste??0,
    '环境':pref.dimensions?.ambiance??0,'服务':pref.dimensions?.service??0,'性价比':pref.dimensions?.value??0,
    '情绪':pref.emoji??'','心情标签':pref.moodTag??'','标签':(pref.tags??[]).join('|'),
    '备注':pref.note??'','日期':pref.createdAt?new Date(pref.createdAt).toLocaleDateString('zh-CN'):'',
  }));
  const ws=XLSX.utils.json_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'探店记录');
  XLSX.writeFile(wb,'tastebridge_'+Date.now()+'.xlsx');
};
const shownName=localName||displayName;
  const uploadAvatar=async(file:File)=>{if(!user?.id)return;setUploadingAvatar(true);try{const fd=new FormData();fd.append("file",file);const r=await fetch("/api/upload",{method:"POST",headers:{"x-user-id":user.id},body:fd});const d=await r.json();if(d.url){setLocalAvatarUrl(d.url);}else throw new Error(d.error??"上传失败");}catch(e){console.error(e);}finally{setUploadingAvatar(false);}};
  const openMonthlySummary=async()=>{if(!user?.id)return;setMonthlyOpen(true);setMonthlyLoading(true);setMonthlyErr(null);try{const r=await fetch(`/api/ai/summary/monthly?userId=${encodeURIComponent(user.id)}`);const d=await r.json();if(!r.ok)throw new Error(d.error??"生成失败");setMonthlySummary(d);}catch(e){setMonthlyErr(e instanceof Error?e.message:"生成失败");}finally{setMonthlyLoading(false);}};const openFriendshipSummary=async(friendId:string)=>{if(!user?.id)return;setFriendshipOpen(true);setFriendshipLoading(true);setFriendshipErr(null);try{const r=await fetch(`/api/ai/summary/friendship?userId=${encodeURIComponent(user.id)}&friendId=${encodeURIComponent(friendId)}`,{headers:{"x-user-id":user.id}});const d=await r.json();if(!r.ok)throw new Error(d.error??"生成失败");setFriendshipSummary(d);}catch(e){setFriendshipErr(e instanceof Error?e.message:"生成失败");}finally{setFriendshipLoading(false);}};const sendShare=async()=>{if(!user?.id||!shareTarget)return;setShareLoading(true);setShareMsg(null);try{const r=await fetch("/api/maps/share",{method:"POST",headers:{"Content-Type":"application/json","x-user-id":user.id},body:JSON.stringify({sharedWith:shareTarget,permission:sharePermission})});const d=await r.json();if(!r.ok)throw new Error(d.error??"发送失败");setShareMsg("共享成功");setShareTarget("");const r2=await fetch("/api/maps/share",{headers:{"x-user-id":user.id}});const d2=await r2.json();setSharedByMe(d2.items??[]);}catch(e){setShareMsg(e instanceof Error?e.message:"发送失败");}finally{setShareLoading(false);}};const updateSharePermission=async(sharedWith:string,permission:"view"|"edit")=>{if(!user?.id)return;await fetch("/api/maps/share",{method:"PATCH",headers:{"Content-Type":"application/json","x-user-id":user.id},body:JSON.stringify({sharedWith,permission})});const r=await fetch("/api/maps/share",{headers:{"x-user-id":user.id}});const d=await r.json();setSharedByMe(d.items??[]);};const revokeShare=async(sharedWith:string)=>{if(!user?.id)return;await fetch(`/api/maps/share?sharedWith=${encodeURIComponent(sharedWith)}`,{method:"DELETE",headers:{"x-user-id":user.id}});const r=await fetch("/api/maps/share",{headers:{"x-user-id":user.id}});const d=await r.json();setSharedByMe(d.items??[]);};const exportMonthlyCard=async()=>{if(!monthlyCardRef.current)return;const dataUrl=await toPng(monthlyCardRef.current,{cacheBust:true,pixelRatio:2,backgroundColor:"#0f172a",filter:(node)=>!(node instanceof HTMLElement&&node.dataset.exportHide==="1")});const a=document.createElement("a");a.href=dataUrl;a.download=`tastebridge-${monthlySummary?.period??"monthly"}-card.png`;a.click();};
  const saveProfile=async()=>{
    if(!user?.id)return;
    setEditSaving(true);setEditErr(null);
    try{
      const r=await fetch('/api/profiles',{method:'PATCH',headers:{'Content-Type':'application/json','x-user-id':user.id},body:JSON.stringify({displayName:editName.trim()||shownName,avatarUrl:localAvatarUrl||(avatarUrl??undefined)})});
      if(!r.ok)throw new Error('保存失败');
      await createSupabaseBrowser().auth.updateUser({data:{full_name:editName.trim()||shownName,avatar_url:localAvatarUrl||(avatarUrl??undefined)}});
      setLocalName(editName.trim()||shownName);setEditMode(false);
    }catch(e){setEditErr(e instanceof Error?e.message:'保存失败');}
    finally{setEditSaving(false);}
  };
  const searchFriends=async()=>{
    if(!friendQuery.trim())return;
    setFriendLoading(true);setFriendError(null);
    try{
      const res=await fetch(`/api/profiles?query=${encodeURIComponent(friendQuery.trim())}`);
      const data=await res.json() as {items?:Array<{id:string;displayName:string|null;avatarUrl:string|null}>;error?:string};
      if(!res.ok)throw new Error(data.error??"搜索失败");
      const list=(data.items??[]).filter((x)=>x.id!==user?.id);
      setFriendResults(list);
    }catch(e){setFriendError(e instanceof Error?e.message:"搜索失败");setFriendResults([]);}finally{setFriendLoading(false);}
  };
  const followUser=async(targetId:string)=>{
    if(!user?.id||!targetId)return;
    setFollowBusy(targetId);setFollowMsg(null);
    try{
      const r=await fetch('/api/follows',{method:'POST',headers:{'Content-Type':'application/json','x-user-id':user.id},body:JSON.stringify({targetId})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error??'关注失败');
      setFollowingIds((prev)=>prev.includes(targetId)?prev:[...prev,targetId]);
      setFollowMsg('已关注');
      const r2=await fetch("/api/follows?userId="+encodeURIComponent(user.id));
      const d2=await r2.json();
      setFollowingCount(((d2).following??[]).length);
      setFollowersCount(((d2).followers??[]).length);
      setFollowingOptions(((d2).followingProfiles??[]) as Array<{id:string;displayName:string|null;avatarUrl:string|null}>);
    }catch(e){setFollowMsg(e instanceof Error?e.message:'关注失败');}
    finally{setFollowBusy(null);}
  };
  const unfollowUser=async(targetId:string)=>{
    if(!user?.id||!targetId)return;
    setFollowBusy(targetId);setFollowMsg(null);
    try{
      const r=await fetch(`/api/follows?targetId=${encodeURIComponent(targetId)}`,{method:'DELETE',headers:{'x-user-id':user.id}});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error??'取消关注失败');
      setFollowingIds((prev)=>prev.filter((id)=>id!==targetId));
      setFollowMsg('已取消关注');
      const r2=await fetch("/api/follows?userId="+encodeURIComponent(user.id));
      const d2=await r2.json();
      setFollowingCount(((d2).following??[]).length);
      setFollowersCount(((d2).followers??[]).length);
      setFollowingOptions(((d2).followingProfiles??[]) as Array<{id:string;displayName:string|null;avatarUrl:string|null}>);
    }catch(e){setFollowMsg(e instanceof Error?e.message:'取消关注失败');}
    finally{setFollowBusy(null);}
  };
  return(<div className="min-h-dvh bg-gradient-to-br from-zinc-900 via-stone-900 to-zinc-800">
    <div className="sticky top-0 z-10 flex items-center gap-3 bg-black/40 px-4 py-3 backdrop-blur-md">
      <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><ArrowLeft className="h-4 w-4"/></Link>
      <h1 className="flex-1 text-base font-semibold text-white">{displayName} 的味觉日记</h1>
      <button onClick={signOut} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/20">退出</button>
      <button onClick={exportXLSX} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-emerald-400 hover:bg-white/20">导出 XLSX</button><button onClick={openMonthlySummary} className="rounded-full bg-amber-500/25 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/35"><span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3"/>本月回顾</span></button>
      {hasFilter&&(<button onClick={()=>{setSearch("");setMinScore(0);setFilterEmoji(null);setFilterTag(null);}}className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/80 hover:bg-white/25"><X className="h-3 w-3"/>清除筛选</button>)}
    </div>
    <div className="mx-auto max-w-lg px-4 pb-12 pt-4"><div className="mb-5 flex items-center gap-4 rounded-2xl bg-white/8 p-4 ring-1 ring-white/10"><input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)uploadAvatar(f);}}/><button type="button" onClick={()=>{if(editMode)avatarInputRef.current?.click();}} className={`relative flex-shrink-0${editMode?" cursor-pointer":" cursor-default"}`}>{(localAvatarUrl||avatarUrl)?<img src={(localAvatarUrl||avatarUrl)??""} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-amber-500/40"/>:<span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-2xl font-bold text-white">{shownName.slice(0,1).toUpperCase()}</span>}{editMode&&<span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-[10px] text-white">{uploadingAvatar?"上传中…":"换头像"}</span>}</button>{!editMode?(<div className="flex-1 min-w-0"><p className="truncate text-lg font-bold text-white">{shownName}</p><p className="truncate text-xs text-white/40">{user?.email}</p><button onClick={()=>{setEditName(shownName);setEditMode(true);}} className="mt-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/20">编辑资料</button></div>):(<div className="flex-1 space-y-2"><input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="显示名称" className="w-full rounded-xl bg-white/10 px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none ring-1 ring-white/20 focus:ring-amber-500"/>{editErr&&<p className="text-xs text-red-400">{editErr}</p>}<div className="flex gap-2"><button onClick={saveProfile} disabled={editSaving} className="flex-1 rounded-xl bg-amber-500 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{editSaving?"保存中…":"保存"}</button><button onClick={()=>setEditMode(false)} className="rounded-xl bg-white/10 px-4 py-1.5 text-xs text-white/70">取消</button></div></div>)}</div>
      {!loading&&!error&&(<><div className="mb-4 flex justify-center gap-4"><StatCard label="收藏店铺" value={items.length}/>{followingCount>0&&<StatCard label="关注" value={followingCount}/>}{followersCount>0&&<StatCard label="粉丝" value={followersCount}/>}{avgScore!==null&&<StatCard label="平均喜爱值" value={avgScore}/>}<StatCard label="情绪标记" value={items.filter(i=>i.pref.emoji).length}/></div><div className="mb-4 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"><p className="text-xs font-semibold text-white/80">添加好友（单向关注）</p><div className="mt-2 flex gap-2"><input value={friendQuery} onChange={e=>setFriendQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void searchFriends();}} placeholder="输入昵称搜索" className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-xs text-white outline-none ring-1 ring-white/15"/><button onClick={()=>void searchFriends()} disabled={friendLoading||!friendQuery.trim()} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{friendLoading?"搜索中…":"搜索"}</button></div>{friendError&&<p className="mt-2 text-[11px] text-red-300">{friendError}</p>}{followMsg&&<p className="mt-2 text-[11px] text-emerald-300">{followMsg}</p>}{friendResults.length>0?(<div className="mt-2 space-y-2">{friendResults.map((u)=>(<div key={u.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"><div className="flex min-w-0 items-center gap-2">{u.avatarUrl?<img src={u.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover"/>:<span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">{(u.displayName??u.id.slice(0,1)).slice(0,1).toUpperCase()}</span>}<div className="min-w-0"><p className="truncate text-sm text-white">{u.displayName??u.id.slice(0,6)}</p><p className="truncate text-[10px] text-white/45">{u.id.slice(0,8)}…</p></div></div><div className="flex items-center gap-2">{followingIds.includes(u.id)?(<button onClick={()=>void unfollowUser(u.id)} disabled={followBusy===u.id} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/80 disabled:opacity-50">{followBusy===u.id?"处理中…":"已关注"}</button>):(<button onClick={()=>void followUser(u.id)} disabled={followBusy===u.id} className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] text-white disabled:opacity-50">{followBusy===u.id?"处理中…":"关注"}</button>)}</div></div>))}</div>):friendQuery.trim()&&!friendLoading&&!friendError?<p className="mt-2 text-[11px] text-white/45">未找到匹配昵称</p>:null}</div><div className="mb-4 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"><p className="text-xs font-semibold text-white/80">共享地图</p><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]"><select value={shareTarget} onChange={e=>setShareTarget(e.target.value)} className="w-full rounded-xl bg-white/10 px-3 py-2 text-xs text-white outline-none ring-1 ring-white/15"><option value="">选择你关注的用户</option>{followingOptions.map((u)=>(<option key={u.id} value={u.id}>{u.displayName??u.id.slice(0,6)}</option>))}</select><select value={sharePermission} onChange={e=>setSharePermission(e.target.value as "view"|"edit")} className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white outline-none ring-1 ring-white/15"><option value="view">仅查看</option><option value="edit">可编辑</option></select><button onClick={()=>void sendShare()} disabled={!shareTarget||shareLoading} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{shareLoading?"发送中…":"发送共享"}</button></div>{shareMsg&&<p className={`mt-2 text-[11px] ${shareMsg.includes("成功")?"text-emerald-300":"text-amber-200"}`}>{shareMsg}</p>}<p className="mt-2 text-[11px] text-white/45">被共享用户可通过共享列表查看你的地图；若选择可编辑，他们可在你地图中的点位补充自己的喜爱记录。</p></div>{sharedByMe.length>0?(<div className="mb-4 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"><p className="text-xs font-semibold text-white/80">我共享给的用户</p><div className="mt-2 space-y-2">{sharedByMe.map((m)=><div key={m.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"><div><p className="text-sm text-white">{m.sharedWithProfile?.display_name??m.sharedWith.slice(0,6)}</p><p className="text-[11px] text-white/45">权限：{m.permission==="edit"?"可编辑":"仅查看"}</p></div><div className="flex items-center gap-2"><select value={m.permission} onChange={e=>void updateSharePermission(m.sharedWith,e.target.value as "view"|"edit")} className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/80"><option value="view">仅查看</option><option value="edit">可编辑</option></select><button onClick={()=>void revokeShare(m.sharedWith)} className="rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] text-red-200">撤回</button></div></div>)}</div></div>):null}{sharedMaps.length>0?(<div className="mb-4 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"><p className="text-xs font-semibold text-white/80">我收到的共享地图</p><div className="mt-2 space-y-2">{sharedMaps.map((m)=><div key={m.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"><div><p className="text-sm text-white">{m.ownerProfile?.display_name??m.ownerId.slice(0,6)} 的地图</p><p className="text-[11px] text-white/45">权限：{m.permission==="edit"?"可编辑":"仅查看"}</p></div><div className="flex gap-2"><Link href={`/?ownerId=${encodeURIComponent(m.ownerId)}`} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/80">查看地图</Link><button onClick={()=>void openFriendshipSummary(m.ownerId)} className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] text-amber-200">共同回忆</button></div></div>)}</div><p className="mt-2 text-[11px] text-white/45">共享地图写权限已接入：拥有 edit 权限时，你可以在对方地图中的点位补充自己的喜爱记录。</p></div>):null}</>)}
      {/* 搜索 */}
      {!loading&&!error&&items.length>0&&(<div className="mb-3 space-y-2">
        <div className="flex items-center gap-2 rounded-xl bg-white/8 px-3 py-2 ring-1 ring-white/10">
          <Search className="h-3.5 w-3.5 text-white/40"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索店名…" className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"/>
          {search&&<button onClick={()=>setSearch("")}><X className="h-3.5 w-3.5 text-white/40"/></button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SCORE_F.map(f=>(<button key={f.min} onClick={()=>setMinScore(f.min)} className={`rounded-full px-2.5 py-1 text-xs transition ${minScore===f.min?"bg-amber-500 text-white":"bg-white/10 text-white/60 hover:bg-white/20"}`}>{f.label}</button>))}
          {allEmojis.map(em=>(<button key={em} onClick={()=>setFilterEmoji(filterEmoji===em?null:em)} className={`rounded-full px-2.5 py-1 text-xs transition ${filterEmoji===em?"bg-violet-500 text-white":"bg-white/10 text-white/60 hover:bg-white/20"}`}>{em}</button>))}
        </div>
        {allTags.length>0&&(<div className="flex flex-wrap gap-1.5">{allTags.map(t=>(<button key={t} onClick={()=>setFilterTag(filterTag===t?null:t)} className={`rounded-full border px-2 py-0.5 text-[11px] transition ${filterTag===t?"border-amber-400 bg-amber-400 text-white":"border-white/15 text-white/50 hover:border-white/30"}`}>{t}</button>))}</div>)}
        {hasFilter&&<p className="text-xs text-white/40">显示 {filtered.length} / {items.length} 条</p>}
      </div>)}
      {loading&&(<div className="flex justify-center pt-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white"/></div>)}
      {error&&<div className="rounded-xl bg-red-900/40 px-4 py-3 text-sm text-red-200">{error}</div>}
      {!loading&&!error&&items.length===0&&(<div className="pt-20 text-center"><Star className="mx-auto mb-3 h-10 w-10 text-white/25"/><p className="text-sm text-white/50">还没有味觉记录</p><Link href="/" className="mt-4 inline-block rounded-full bg-amber-500 px-5 py-2 text-sm font-medium text-white hover:bg-amber-400">去添加店铺</Link></div>)}
      <div className="flex flex-col gap-3">
        {filtered.map(({pref,spot})=>(<div key={pref.id} className="overflow-hidden rounded-2xl bg-white/8 ring-1 ring-white/10">
          {pref.images&&pref.images.length>0&&(<div className="flex gap-1.5 overflow-x-auto p-2 pb-0">{pref.images.map(url=>(<img key={url} src={url} alt="" className="h-28 w-28 flex-shrink-0 rounded-xl object-cover"/>))}</div>)}
          <div className="flex items-start gap-3 p-4">
            <ScoreBadge value={pref.overall}/>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {pref.emoji&&<span className="text-base leading-none">{pref.emoji}</span>}
                <h2 className="truncate text-sm font-semibold text-white">{spot?.name??"未知店铺"}</h2>
                {pref.invitedBy&&<span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-300">邀请</span>}
              </div>
              {spot?.address&&(<div className="mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0 text-white/40"/><p className="truncate text-[11px] text-white/50">{spot.address}</p></div>)}
              {pref.moodTag&&<span className="mt-1 inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-300">{pref.moodTag}</span>}
            </div>
            <span className="flex-shrink-0 text-[11px] text-white/35">{pref.visitDate?.slice(0,10)}</span>
            <button onClick={()=>handleDelete(pref.id)} className="ml-2 rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-900/50">删除</button>
          </div>
          <MiniDims dims={pref.dimensions}/>
          {pref.tags&&pref.tags.length>0&&(<div className="flex flex-wrap gap-1.5 px-4 pb-3">{pref.tags.map(t=>(<span key={t} className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/60">{t}</span>))}</div>)}
          {pref.note&&<p className="border-t border-white/8 px-4 py-2.5 text-xs italic text-white/55">&ldquo;{pref.note}&rdquo;</p>}
        </div>))}
      </div>
      {friendshipOpen&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-md rounded-3xl border border-sky-300/20 bg-zinc-900 p-4 text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)]"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-sky-200">共同回忆</p><button onClick={()=>setFriendshipOpen(false)} className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20">关闭</button></div>{friendshipLoading?<p className="mt-3 text-sm text-white/70">生成中…</p>:friendshipErr?<p className="mt-3 text-sm text-red-300">{friendshipErr}</p>:friendshipSummary?(<div className="mt-3 space-y-3 text-sm"><p className="rounded-xl bg-white/5 px-3 py-2">共同探店：<span className="font-semibold text-sky-300">{friendshipSummary.totalCommonVisits}</span> 家</p><p>共同最爱店铺：{friendshipSummary.topCommonSpot}</p><p>共同偏好菜系：{friendshipSummary.commonCategories?.length?friendshipSummary.commonCategories.join("、"):"暂无"}</p><ul className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">{(friendshipSummary.topCommonSpots??[]).map((s:any,idx:number)=><li key={s.id}>{idx+1}. {s.name} · {s.avg}分</li>)}</ul><p className="rounded-xl bg-sky-500/10 p-3 text-xs text-sky-100">{friendshipSummary.insight}</p><div className="rounded-xl border border-sky-300/20 bg-sky-500/10 p-3"><p className="text-xs text-sky-200">友谊主题曲：{friendshipSummary.musicSearchQuery}</p><p className="mt-1 text-[11px] text-sky-100/85">{friendshipSummary.musicReason}</p></div></div>):null}</div></div>)}{monthlyOpen&&(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div ref={monthlyCardRef} className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-300/30 bg-zinc-900 p-4 text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)]"><div className="flex items-center justify-between"><p className="text-sm font-semibold tracking-wide text-amber-200">TasteBridge 月度分享卡</p><button onClick={()=>setMonthlyOpen(false)} className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20">关闭</button></div>{monthlyLoading?<p className="mt-3 text-sm text-white/70">正在生成中…</p>:monthlyErr?<p className="mt-3 text-sm text-red-300">{monthlyErr}</p>:monthlySummary?(<div className="mt-3 space-y-3 text-sm"><p className="rounded-xl border border-amber-300/20 bg-black/20 px-3 py-2 text-amber-100/90">{monthlySummary.period} · 本月探店数量：<span className="font-semibold text-amber-300">{monthlySummary.totalVisits}</span> · 平均喜爱值：<span className="font-semibold text-amber-300">{monthlySummary.avgRating}</span></p><div><p className="text-white/75">最爱店铺 TOP3</p><ul className="mt-1 space-y-1">{monthlySummary.topSpots.map((s,idx)=><li key={s.id} className="text-xs text-white/90">{idx+1}. {s.name}（{s.avg}分）</li>)}</ul></div><p>主导情绪标签：{monthlySummary.topMoodTags.length?monthlySummary.topMoodTags.join("、"):"暂无"}</p><p>本月热门店铺分类标签：{monthlySummary.topTags.length?monthlySummary.topTags.join("、"):"暂无"}</p><p className="rounded-lg bg-white/5 p-2 text-xs text-white/85">{monthlySummary.insight}</p><div className="rounded-lg border border-amber-300/30 bg-amber-500/10 p-2"><p className="text-xs text-amber-200">qwen-plus 推荐歌曲：{monthlySummary.musicSearchQuery}</p><p className="mt-1 text-[11px] text-amber-100/85">{monthlySummary.musicReason}</p></div><div data-export-hide="1" className="flex justify-end"><button onClick={exportMonthlyCard} className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-400"><ImageDown className="h-3.5 w-3.5"/>导出图片（PNG）</button></div></div>):null}</div></div>)}
    </div>
  </div>);
}
