// 头像持久化：saveProfile 后同步更新 auth user_metadata
const fs=require("fs");
const F="src/app/profile/page.tsx";
let c=fs.readFileSync(F,"utf8");
if(c.includes("updateUser")){console.log("12a skip");process.exit(0);}

// 在 saveProfile 成功后、setLocalName 前加 updateUser
c=c.replace(
  "if(!r.ok)throw new Error('保存失败');\n      setLocalName",
  "if(!r.ok)throw new Error('保存失败');\n      await createSupabaseBrowser().auth.updateUser({data:{full_name:editName.trim()||shownName,avatar_url:localAvatarUrl||(avatarUrl??undefined)}});\n      setLocalName"
);

// 加 import createSupabaseBrowser（如果没有）
if(!c.includes("createSupabaseBrowser")){
  c=c.replace('"use client";','"use client";\nimport { createSupabaseBrowser } from "@/lib/supabase/browser";');
}

fs.writeFileSync(F,c,"utf8");
console.log("12a ok");
