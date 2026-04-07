const fs=require("fs");
const F="src/app/profile/page.tsx";
let c=fs.readFileSync(F,"utf8");
if(c.includes("uploadAvatar")){console.log("10d skip");process.exit(0);}

// 1. 加 useRef import
c=c.replace(
  "import { useEffect, useMemo, useState } from \"react\";",
  "import { useEffect, useMemo, useRef, useState } from \"react\";"
);

// 2. 加 localAvatarUrl + avatarInputRef states
c=c.replace(
  "const[localName,setLocalName]=useState(\"\");",
  "const[localName,setLocalName]=useState(\"\");\n  const[localAvatarUrl,setLocalAvatarUrl]=useState<string|null>(null);\n  const[uploadingAvatar,setUploadingAvatar]=useState(false);\n  const avatarInputRef=useRef<HTMLInputElement>(null);"
);

// 3. 加 uploadAvatar handler（在 saveProfile 前）
c=c.replace(
  "const saveProfile=async()=>{",
  `const uploadAvatar=async(file)=>{if(!user?.id)return;setUploadingAvatar(true);try{const fd=new FormData();fd.append("file",file);const r=await fetch("/api/upload",{method:"POST",headers:{"x-user-id":user.id},body:fd});const d=await r.json();if(d.url){setLocalAvatarUrl(d.url);}else throw new Error(d.error??"上传失败");}catch(e){console.error(e);}finally{setUploadingAvatar(false);}};\n  const saveProfile=async()=>{`
);

// 4. 在 saveProfile PATCH 中加 avatarUrl
c=c.replace(
  "body:JSON.stringify({displayName:editName.trim()||shownName})",
  "body:JSON.stringify({displayName:editName.trim()||shownName,avatarUrl:localAvatarUrl||(avatarUrl??undefined)})"
);

// 5. 头像改为可点击（edit 模式），加 file input
const OLD_AVA="{avatarUrl?<img src={avatarUrl} alt=\"\" className=\"h-16 w-16 flex-shrink-0 rounded-full object-cover ring-2 ring-amber-500/40\"/>:<span className=\"flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-2xl font-bold text-white\">{shownName.slice(0,1).toUpperCase()}</span>}";
const CUR_AVA="localAvatarUrl||avatarUrl";
const NEW_AVA=`<input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)uploadAvatar(f);}}/><button type="button" onClick={()=>{if(editMode)avatarInputRef.current?.click();}} className={\`relative flex-shrink-0\${editMode?" cursor-pointer":" cursor-default"}\`}>{(${CUR_AVA})?<img src={(${CUR_AVA})??""} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-amber-500/40"/>:<span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-2xl font-bold text-white">{shownName.slice(0,1).toUpperCase()}</span>}{editMode&&<span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-[10px] text-white">{uploadingAvatar?"上传中…":"换头像"}</span>}</button>`;
c=c.replace(OLD_AVA,NEW_AVA);

fs.writeFileSync(F,c,"utf8");
console.log("10d ok");
