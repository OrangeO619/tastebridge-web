import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  query: z.string().min(1),
});

const KNOWN_TAGS = [
  "适合约会", "适合聚餐", "适合一人食", "适合带娃", "商务宴请",
  "上菜快", "服务贴心", "自助点餐", "有包间", "上菜慢",
  "环境优雅", "有外摆", "安静", "有景观", "工业风",
  "性价比高", "价格偏高", "物有所值", "有团购",
  "停车方便", "近地铁", "临街", "巷子深处",
  "重口味", "清淡", "正宗", "创意菜", "辣度可选",
  "宠物友好", "深夜营业", "网红店", "老字号", "需预约", "排队警告",
] as const;

const KNOWN_CATEGORIES = [
  "火锅", "烧烤", "日料", "韩餐", "西餐", "咖啡", "甜品", "小吃", "面食", "粤菜", "川菜", "湘菜", "东北菜",
] as const;

type IntentResult = {
  filters: {
    tags: string[];
    overall_min: number | null;
    overall_max: number | null;
    categories: string[];
    keyword: string | null;
  };
  summary: string;
};

function fallbackIntent(query: string): IntentResult {
  const q = query.trim();
  const tags = KNOWN_TAGS.filter((t) => q.includes(t));
  const categories = KNOWN_CATEGORIES.filter((c) => q.includes(c));

  let overallMin: number | null = null;
  let overallMax: number | null = null;

  if (/5分|满分|五星|5星/.test(q)) overallMin = 5;
  else if (/[≥>大于]\s*4\.5|4\.5分以上|4分半以上/.test(q)) overallMin = 4.5;
  else if (/[≥>大于]\s*4|4分以上|高分/.test(q)) overallMin = 4;
  else if (/[≥>大于]\s*3|3分以上/.test(q)) overallMin = 3;

  if (/[≤<小于]\s*2|2分以下/.test(q)) overallMax = 2;

  const keyword = tags.length === 0 && categories.length === 0 ? q : null;

  return {
    filters: {
      tags,
      overall_min: overallMin,
      overall_max: overallMax,
      categories,
      keyword,
    },
    summary: `为你解析到：${[
      tags.length ? `标签 ${tags.join("、")}` : "",
      categories.length ? `分类 ${categories.join("、")}` : "",
      overallMin ? `最低评分 ${overallMin}` : "",
      overallMax ? `最高评分 ${overallMax}` : "",
      keyword ? `关键词 ${keyword}` : "",
    ].filter(Boolean).join("；") || "暂无明显筛选条件"}`,
  };
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { query } = parsed.data;
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const model = process.env.DASHSCOPE_MODEL || "qwen-plus";

  if (!apiKey) return NextResponse.json(fallbackIntent(query));

  try {
    const prompt = `你是 TasteBridge 的语义搜索意图解析器。\n把用户查询解析成 JSON：\n{\n  "filters": {\n    "tags": string[],\n    "overall_min": number|null,\n    "overall_max": number|null,\n    "categories": string[],\n    "keyword": string|null\n  },\n  "summary": string\n}\n\n仅输出 JSON，不要输出解释。\n\n可选标签：${KNOWN_TAGS.join("、")}\n可选分类：${KNOWN_CATEGORIES.join("、")}\n\n用户查询：${query}`;

    const resp = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "你只输出合法 JSON。" },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json(fallbackIntent(query));

    try {
      const parsedJson = JSON.parse(content) as IntentResult;
      const safe: IntentResult = {
        filters: {
          tags: (parsedJson.filters?.tags ?? []).filter((t) => KNOWN_TAGS.includes(t as never)),
          overall_min: typeof parsedJson.filters?.overall_min === "number" ? parsedJson.filters.overall_min : null,
          overall_max: typeof parsedJson.filters?.overall_max === "number" ? parsedJson.filters.overall_max : null,
          categories: (parsedJson.filters?.categories ?? []).filter((c) => KNOWN_CATEGORIES.includes(c as never)),
          keyword: typeof parsedJson.filters?.keyword === "string" && parsedJson.filters.keyword.trim() ? parsedJson.filters.keyword.trim() : null,
        },
        summary: typeof parsedJson.summary === "string" && parsedJson.summary.trim() ? parsedJson.summary : fallbackIntent(query).summary,
      };
      return NextResponse.json(safe);
    } catch {
      return NextResponse.json(fallbackIntent(query));
    }
  } catch {
    return NextResponse.json(fallbackIntent(query));
  }
}
