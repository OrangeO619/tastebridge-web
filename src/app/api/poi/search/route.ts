import { NextResponse } from "next/server";
import { z } from "zod";
import { getAmapWebServiceKey } from "@/lib/amap/config";
import { amapPlaceTextSearch } from "@/lib/amap/place-text-search";

const bodySchema = z.object({
  keywords: z.string().min(1, "请输入关键词"),
  city: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  offset: z.coerce.number().int().min(1).max(25).optional().default(15),
  cityLimit: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const key = getAmapWebServiceKey();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "未配置 AMAP_WEB_SERVICE_KEY：请在 .env.local 添加高德 Web 服务 Key（非 JS API Key）",
        results: [],
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors, results: [] },
      { status: 400 },
    );
  }

  const b = parsed.data;
  const result = await amapPlaceTextSearch({
    key,
    keywords: b.keywords,
    city: b.city,
    page: b.page,
    offset: b.offset,
    cityLimit: b.cityLimit,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, results: [] },
      { status: 502 },
    );
  }

  return NextResponse.json({
    results: result.pois,
    totalHint: result.count,
  });
}
