const fs=require("fs");
// 加 DELETE 到 /api/prefs/route.ts
const F="src/app/api/prefs/route.ts";
let c=fs.readFileSync(F,"utf8");
if(c.includes("async function DELETE")){console.log("12c skip");process.exit(0);}
const DEL=["","export async function DELETE(request: Request) {","  const userId = request.headers.get('x-user-id');","  if (!userId) return Response.json({ error: '未登录' }, { status: 401 });","  const { searchParams } = new URL(request.url);","  const prefId = searchParams.get('prefId');","  if (!prefId) return Response.json({ error: '缺少 prefId' }, { status: 400 });","  const db = createSupabaseAdmin();","  const { error } = await db.from('pref_records').delete().eq('id', prefId).eq('user_id', userId);","  if (error) return Response.json({ error: error.message }, { status: 500 });","  return Response.json({ ok: true });","}"].join("\n");
c+=DEL;
fs.writeFileSync(F,c,"utf8");
console.log("12c ok");
