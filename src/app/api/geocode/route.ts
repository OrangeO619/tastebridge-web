import { NextResponse } from "next/server";
import { getAmapWebServiceKey } from "@/lib/amap/config";

/**
 * 高德地理编码 API
 * 文档: https://lbs.amap.com/api/webservice/guide/api/georegeo
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim();
  
  if (!address) {
    return NextResponse.json({ error: "缺少 address 参数" }, { status: 400 });
  }
  
  const key = getAmapWebServiceKey();
  if (!key) {
    return NextResponse.json({ error: "未配置高德 Web 服务 Key" }, { status: 500 });
  }
  
  try {
    const url = new URL("https://restapi.amap.com/v3/geocode/geo");
    url.searchParams.set("key", key);
    url.searchParams.set("address", address);
    url.searchParams.set("output", "json");
    
    const res = await fetch(url.toString());
    const data = await res.json();
    
    if (data.status !== "1" || !data.geocodes || data.geocodes.length === 0) {
      return NextResponse.json({ 
        error: data.info || "地理编码失败",
        center: null 
      });
    }
    
    const geo = data.geocodes[0];
    const location = geo.location; // 格式: "经度,纬度"
    
    if (!location) {
      return NextResponse.json({ error: "未找到坐标", center: null });
    }
    
    const [lng, lat] = location.split(",").map(Number);
    
    return NextResponse.json({
      center: [lng, lat],
      formattedAddress: geo.formatted_address,
      province: geo.province,
      city: geo.city,
      district: geo.district,
      level: geo.level, // 省、市、区县、乡镇、道路、门牌号等
    });
  } catch (err) {
    console.error("地理编码请求失败:", err);
    return NextResponse.json({ error: "地理编码请求失败" }, { status: 500 });
  }
}
