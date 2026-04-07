import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "pref-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase 未配置" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "请上传 multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "缺少 file 字段" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "仅支持 JPEG / PNG / WebP / GIF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "图片不超过 5 MB" }, { status: 400 });
  }

  const userId = (request.headers.get("x-user-id") ?? "anon").slice(0, 64);
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json(
      { error: `上传失败: ${error.message}（请确认 Storage bucket "${BUCKET}" 已在 Supabase 创建并设为 public）` },
      { status: 500 },
    );
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return NextResponse.json({ url: publicUrl }, { status: 201 });
}
