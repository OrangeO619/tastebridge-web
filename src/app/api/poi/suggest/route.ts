import { NextResponse } from "next/server";
import { z } from "zod";
import { getAmapWebServiceKey } from "@/lib/amap/config";
import { amapInputTips } from "@/lib/amap/input-tips";

const querySchema = z.object({
  keywords: z.string().min(1, "请输入关键词"),
  city: z.string().optional(),
  cityLimit: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export async function GET(request: Request) {
  const key = getAmapWebServiceKey();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "未配置 AMAP_WEB_SERVICE_KEY：请在 .env.local 添加高德 Web 服务 Key",
        tips: [],
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    keywords: searchParams.get("keywords") ?? "",
    city: searchParams.get("city") ?? undefined,
    cityLimit: searchParams.get("cityLimit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors, tips: [] },
      { status: 400 },
    );
  }

  const q = parsed.data;
  const result = await amapInputTips({
    key,
    keywords: q.keywords,
    city: q.city,
    cityLimit: q.cityLimit,
    datatype: "poi",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, tips: [] },
      { status: 502 },
    );
  }

  return NextResponse.json({
    tips: result.tips,
    count: result.count,
  });
}
