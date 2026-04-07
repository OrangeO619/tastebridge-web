import { NextResponse } from "next/server";
import { getAmapWebServiceKey } from "@/lib/amap/config";
import { amapPlaceDetail } from "@/lib/amap/place-detail";

export async function GET(request: Request) {
  const key = getAmapWebServiceKey();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "未配置 AMAP_WEB_SERVICE_KEY：请在 .env.local 添加高德 Web 服务 Key",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId")?.trim() ?? "";
  if (!placeId) {
    return NextResponse.json({ error: "缺少 placeId" }, { status: 400 });
  }

  const result = await amapPlaceDetail(key, placeId);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json({ poi: result.poi });
}
