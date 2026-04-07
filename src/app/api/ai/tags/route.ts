import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

const bodySchema = z.object({
  spotName: z.string().min(1),
  note: z.string().default(""),
  overall: z.number().int().min(1).max(5),
  poiType: z.string().optional(),
  currentTags: z.array(z.string()).optional().default([]),
});

// PRD 3.4.2 标签体系
const TAG_TAXONOMY = `
场景适配：适合约会、适合聚餐、适合一人食、适合带娃、商务宴请
服务体验：上菜快、服务贴心、自助点餐、有包间、上菜慢
环境氛围：环境优雅、有外摆、安静、有景观、工业风
性价比：性价比高、价格偏高、物有所值、有团购
交通便利：停车方便、近地铁、临街、巷子深处
口味风格：重口味、清淡、正宗、创意菜、辣度可选
特殊标签：宠物友好、深夜营业、网红店、老字号、需预约、排队警告
`.trim();

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { tags: [], error: "OPENAI_API_KEY 未配置" },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ tags: [], error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { tags: [], error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { spotName, note, overall, poiType, currentTags } = parsed.data;

  try {
    const openai = new OpenAI({ apiKey });

    const userMsg = [
      `餐厅名称：${spotName}`,
      poiType ? `店铺类型：${poiType}` : "",
      `喜爱值评分：${overall}/5`,
      note ? `用户笔记：${note}` : "（用户未写笔记）",
      currentTags.length ? `已有标签：${currentTags.join("、")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `你是 TasteBridge 的店铺标签推荐助手。
根据用户笔记和评分，从以下标签体系中选择 3-5 个最相关的标签。

标签体系：
${TAG_TAXONOMY}

规则：
- 只从标签体系中选择，禁止创造新标签
- 评分低（1-2）时优先推荐「排队警告」「上菜慢」等负面标签
- 评分高（4-5）且笔记提到环境/氛围时，推荐「环境优雅」「适合约会」等
- 空笔记时根据评分和店铺类型推断
- 输出 JSON：{ "tags": ["标签1", "标签2", ...] }`,
        },
        { role: "user", content: userMsg },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let tags: string[] = [];
    try {
      const obj = JSON.parse(raw) as { tags?: unknown };
      if (Array.isArray(obj.tags)) {
        tags = obj.tags.filter((t): t is string => typeof t === "string").slice(0, 8);
      }
    } catch {
      tags = [];
    }

    return NextResponse.json({ tags });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI 调用失败";
    return NextResponse.json({ tags: [], error: msg }, { status: 500 });
  }
}
