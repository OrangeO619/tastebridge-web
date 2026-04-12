1. 文档信息
项目	内容
产品名称	TasteBridge
产品定位	以地图为核心的探店记忆共享平台
目标平台	Web（移动优先），后续可考虑小程序/App
技术栈	React 18 + TypeScript + Next.js 14 + Tailwind CSS + 高德地图 JS API v2.0 + Supabase + Vercel
AI模型	通义千问 qwen-plus-2025-07-28
AI能力	标签推荐、语义化搜索、月度/年度/共同回忆总结、相似推荐
语音功能	Web Speech API（浏览器原生，完全免费）
音乐服务	Spotify Web API（搜索 + 30秒试听）
POI服务	高德地图API（店名、地址、电话、营业时间自动填充，缺失即留空）
2. 产品概述
2.1 目标用户与痛点
目标用户画像：

探店爱好者：喜欢发掘新店，希望系统化记录体验

美食记录者：吃饭必拍照，想给食物打标签、写感受

小团体组织者：和几个朋友组成"美食小分队"，共享好店

核心痛点：

信息分散：位置在 Maps，口味在点评App，感受在备忘录，回忆时东拼西凑

重复踩坑：忘了某家店好不好吃，过段时间又去一次

分享负担：想推荐给朋友，要发定位+发点评+发照片，操作繁琐

社交压力：不想在群里频繁刷屏打扰朋友，但又想共享

2.2 核心价值主张
从"分散记录"到"地图上的记忆博物馆"：

用户到店 → 一键标记点位 → 记录喜爱值 + 文字/图片 → 形成个人情绪地图 → 可选择共享给好友 → 好友可补充自己的喜爱值 → 地图上叠加多重视角

2.3 设计风格关键词
清新、食欲、轻社交、地图优先

3. 核心功能模块
3.1 地图视图（核心）
功能点	描述	交互细节与逻辑
基础地图展示	加载底图，显示用户已标记的餐饮店点位	使用高德地图 GL JS，支持缩放/平移；点位以自定义图标显示（可区分 种草/拔草/待去）
点位聚合	缩放级别低时，密集点位自动聚合为数字标记	点击聚合数字展开为多个单独点位；聚合逻辑在客户端实现
点位详情卡片	点击地图标记，从底部弹出卡片	卡片包含：店名、地址、喜爱值评分、情绪标签、店铺分类标签、简短评价、上次到访时间、参与人数
多人记录展示	同一店铺有多人记录时的显示	卡片上显示"2人评价"，点击可展开每个人的记录
喜爱值视觉化	点位图标颜色或大小随平均喜爱值评分变化	高喜爱值用暖色大图标，低喜爱值用冷色小图标；一目了然
地图筛选	按喜爱值评分范围、情绪标签、店铺分类标签、到访时间筛选显示的点位	筛选器悬浮在地图角落，实时更新地图显示
3.2 点位标记与记录
功能点	描述	交互细节与逻辑
添加点位：搜索添加 搜索：调用高德POI 
店铺信息	自动填充/手动填写	搜索模式自动填充店名、地址、电话、营业时间（如有）；缺失字段留空，不要求用户补充；手动模式支持自定义
喜爱值评分	用户对店铺的综合理性评价	设计为5星，用于排序、筛选、统计；可附加一句话短评
情绪标签	用户记录探店时的感性心情	预置：🥰 惊喜 / 😌 舒服 / 🤔 一般 / 😤 踩雷；支持自定义Emoji+文字；用于情感回忆
店铺分类标签	千问 qwen-plus-2025-07-28 推荐的店铺客观属性标签	用于店铺分类和语义化搜索。标签体系包括：场景适配、服务体验、环境氛围、性价比、交通便利、口味风格、特殊标签
同行记录邀请	添加记录后，可邀请同行的朋友一起记录	可选"添加同行的朋友"，系统发送通知邀请好友补充自己的记录
图文记录	上传照片 + 详细笔记	支持多图上传；笔记支持 Markdown 或富文本
到访时间	自动记录当前时间，支持修改	便于日后回忆"那年今日"
3.3 喜爱值系统
typescript
type PrefRecord = {
  // 理性评价
  overall: number;        // 喜爱值评分 1-5（用于排序、筛选、统计）
  
  // 感性记忆
  emoji?: string;         // 情绪Emoji（如 🥰 😌 🤔 😤）
  moodTag?: string;       // 情绪标签文字（如 "惊喜" "舒服" "一般" "踩雷"）
  
  // 店铺分类标签（qwen-plus-2025-07-28 推荐 + 用户自定义，用于语义化搜索）
  tags: string[];         // 如 ["适合约会", "环境优雅", "上菜快", "停车方便"]
  
  // 协作信息
  invitedBy?: string;      // 邀请者的userId（如果是被邀请添加的）
  isCollaborative: boolean; // 是否为协作记录
  
  // 可选的多维度评分
  dimensions?: {
    taste: number;        // 口味 1-5
    ambiance: number;     // 氛围 1-5
    service: number;      // 服务 1-5
    value: number;        // 性价比 1-5
  };
  
  note?: string;
  images: string[];
  visitDate: string;
  visitCount: number;       // 用户到访此店的次数（随每次添加自动累加）
  createdAt: string;
  updatedAt: string;
}
三种标签/评分的定位区分：

类型	本质	形式	用途	示例
喜爱值评分	理性评价	1-5分数字	排序、筛选、统计、趋势分析	4分
情绪标签	感性记忆	Emoji + 文字	快速回忆当时感受、情感共鸣	🥰 惊喜
店铺分类标签	客观属性	文字标签	店铺分类、语义化搜索	"适合约会" "上菜快"
3.4 AI智能搜索与推荐
3.4.1 语义化搜索（核心AI功能）
功能点	描述	交互细节与逻辑
自然语言输入	用户可用日常语言描述需求	搜索框提示："试试'适合约会的安静餐厅'或'上菜快的火锅店'"
意图解析	qwen-plus-2025-07-28 将自然语言转换为结构化筛选条件	调用意图解析API，返回匹配的标签、菜系、评分范围等
数据库查询	根据筛选条件查询用户自己的探店记录	基于店铺分类标签做精确匹配
结果展示	在地图上高亮显示匹配的店铺	同时显示结果数量和AI生成的摘要
降级方案	AI解析失败时回退到关键词搜索	搜索店名、地址、笔记内容
语义化搜索示例：

用户输入	qwen-plus-2025-07-28 解析意图	数据库查询	结果
"适合约会的安静餐厅"	tags: [适合约会, 安静]	匹配这两个标签的店	3家
"上菜快的火锅店"	tags: [上菜快]; categories: [火锅]	火锅 + 上菜快标签	2家
"停车方便的地方"	tags: [停车方便]	匹配该标签的店	5家
"5分好评的店"	overall_min: 5	评分=5的店	8家
"性价比高的日料"	tags: [性价比高]; categories: [日料]	日料 + 性价比高	1家
3.4.2 店铺分类标签体系（语义化搜索的基础）
类别	说明	示例标签
场景适配	适合什么样的场合	适合约会 适合聚餐 适合一人食 适合带娃 商务宴请
服务体验	服务相关特征	上菜快 服务贴心 自助点餐 有包间 上菜慢
环境氛围	店铺环境特点	环境优雅 有外摆 安静 有景观 工业风
性价比	价格相关特征	性价比高 价格偏高 物有所值 有团购
交通便利	位置相关特征	停车方便 近地铁 临街 巷子深处
口味风格	口味相关特征	重口味 清淡 正宗 创意菜 辣度可选
特殊标签	其他有用特征	宠物友好 深夜营业 网红店 老字号 需预约 排队警告
3.4.3 相似店铺推荐
功能点	描述	交互细节与逻辑
相似推荐	在店铺详情页推荐相似店铺	qwen-plus-2025-07-28 基于当前店铺的店铺分类标签、菜系、用户历史喜爱值，推荐相似店铺并附推荐理由
3.5 社交共享与协作
功能点	描述	交互细节与逻辑
地图共享	用户可选择将整个地图或特定点位共享给好友	生成共享链接 / 邀请特定用户
好友协作模式	好友被邀请后，可在同一地图上添加自己的喜爱值	同一店铺可有多人的喜爱值，地图上以"堆叠"方式显示，互不覆盖
同行记录邀请	添加记录时，可选择"添加同行的朋友"	系统发送通知，邀请好友补充自己的记录
协作邀请管理	用户可查看收到的协作邀请	通知中心展示待处理的邀请，可接受或拒绝
异步提醒	好友添加新点位时，非实时通知	采用摘要式通知（如"本周你的美食地图新增3个点位"），避免频繁打扰
共同回忆	系统定期生成"你们一起探索的美食地图"回顾	包含统计数据、共同最爱店铺、qwen-plus-2025-07-28 推荐的友谊主题曲（可换歌）
3.6 个人中心与历史回顾
功能点	描述
我的足迹	地图上高亮显示所有我到过的店，支持时间轴浏览
喜爱值统计	我评分的分布、我最爱的菜系/区域
情绪日历	按月份展示情绪标签分布，快速回顾每月心情
标签云	展示我最常用的店铺分类标签，一眼看出我的美食偏好（如"适合约会""火锅""上菜快"）
协作记录	展示我与好友共同记录的店铺
月度总结	每月1日自动生成，包含本月探店数量、平均喜爱值、最爱店铺TOP3、主导情绪标签、本月热门店铺分类标签；qwen-plus-2025-07-28 智能推荐一首契合氛围的歌曲
年度总结	每年1月自动生成，包含全年总览、年度最佳店铺、菜系偏好、情绪词云、年度标签云、成就徽章；qwen-plus-2025-07-28 智能推荐一首年度主题曲
共同回忆	与好友共享地图时，定期生成共同回忆；包含共同探店数量、共同最爱店铺、qwen-plus-2025-07-28 推荐的友谊主题曲（可换歌）
待去清单	种草但还没去的店，可标记"想去"
4. AI功能详细设计（qwen-plus-2025-07-28）
4.1 AI功能总览
AI功能	触发时机	输入	输出	模型
店铺分类标签推荐	用户完成笔记和评分后	用户笔记、评分、店铺类型	3-5个店铺分类标签	qwen-plus-2025-07-28
语义化搜索 - 意图解析	用户在搜索框输入自然语言	用户查询文本	结构化筛选条件（标签、菜系、评分范围）	qwen-plus-2025-07-28
语义化搜索 - 结果润色	返回搜索结果后	查询文本、结果数量、店铺列表	一句友好的结果摘要	qwen-plus-2025-07-28
月度总结	每月1日	本月所有记录	统计数据 + 情绪关键词 + 热门标签 + 音乐搜索词+推荐理由	qwen-plus-2025-07-28
年度总结	每年1月	全年所有记录	统计数据 + 最爱店铺 + 标签云 + 情绪词云 + 音乐搜索词+推荐理由	qwen-plus-2025-07-28
共同回忆	定期触发	两人共同记录	统计数据 + 音乐搜索词+推荐理由	qwen-plus-2025-07-28
相似推荐	进入店铺详情页	店铺标签 + 用户历史标签偏好	相似店铺列表 + 推荐理由	qwen-plus-2025-07-28
语音功能说明：

语音转文字使用 Web Speech API（浏览器原生，完全免费）

无需配置API密钥，直接调用浏览器能力

4.2 千问API接入配置
环境变量（.env.local）：

env
# 千问API（阿里云百炼）
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx
DASHSCOPE_MODEL=qwen-plus-2025-07-28
API调用示例：

typescript
// app/api/ai/route.ts
const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: process.env.DASHSCOPE_MODEL,  // qwen-plus-2025-07-28
    messages: [...],
    temperature: 0.7,
  }),
});
4.3 店铺分类标签推荐 - 详细说明
功能定位：为店铺打上客观属性标签，用于店铺分类和语义化搜索。qwen-plus-2025-07-28 从用户笔记中推断店铺特征，并基于店铺类型补充知识库标签。

标签分类体系：详见 3.4.2

千问Prompt设计：

javascript
{
  model: 'qwen-plus-2025-07-28',
  messages: [
    {
      role: 'system',
      content: `你是一个美食探店助手。根据用户的笔记和评分，推荐3-5个店铺分类标签。
                标签应从以下类别选择：场景适配、服务体验、环境氛围、性价比、交通便利、口味风格、特殊标签。
                只输出JSON数组，格式：["标签1", "标签2", ...]
                示例输出：["适合约会", "环境优雅", "服务贴心"]`
    },
    {
      role: 'user',
      content: `笔记：${note}\n评分：${rating}分\n店铺类型：${category}`
    }
  ]
}
输入与输出示例：

用户笔记	评分	店铺类型	qwen-plus-2025-07-28 推荐标签
"生煎不错，汤汁丰富，但排队太久"	4	小吃	["排队警告", "性价比高", "小吃"]
"环境很安静，适合约会，服务好"	5	西餐	["适合约会", "环境优雅", "服务贴心", "安静"]
"价格小贵，但味道值得，停车方便"	4	日料	["价格偏高", "物有所值", "停车方便"]
"上菜太慢了，等了40分钟"	2	火锅	["上菜慢", "不推荐", "排队警告"]
（空白笔记，只有评分5）	5	咖啡店	["适合办公", "安静", "拍照好看", "手冲"]
4.4 语义化搜索 - 意图解析
千问Prompt设计：

javascript
{
  model: 'qwen-plus-2025-07-28',
  messages: [
    {
      role: 'system',
      content: `你是一个搜索意图解析助手。将用户的自然语言搜索转换为结构化查询条件。
                可用标签类别：场景适配、服务体验、环境氛围、性价比、交通便利、口味风格、特殊标签。
                可用标签值：适合约会、适合聚餐、适合一人食、适合带娃、商务宴请、上菜快、服务贴心、环境优雅、安静、性价比高、停车方便、重口味、宠物友好、网红店等。
                只输出JSON，格式：{"tags": [], "categories": null, "overall_min": null}
                示例输入："适合约会的安静餐厅" → {"tags": ["适合约会", "安静"], "categories": null, "overall_min": null}
                示例输入："5分好评的火锅店" → {"tags": [], "categories": ["火锅"], "overall_min": 5}`
    },
    {
      role: 'user',
      content: `用户输入：${query}`
    }
  ]
}
输入与输出示例：

用户输入	qwen-plus-2025-07-28 输出
"适合约会的安静餐厅"	{"tags": ["适合约会", "安静"], "categories": null, "overall_min": null}
"上菜快的火锅店"	{"tags": ["上菜快"], "categories": ["火锅"], "overall_min": null}
"停车方便的地方"	{"tags": ["停车方便"], "categories": null, "overall_min": null}
"5分好评的店"	{"tags": [], "categories": null, "overall_min": 5}
"性价比高的日料"	{"tags": ["性价比高"], "categories": ["日料"], "overall_min": null}
4.5 月度/年度总结
月度总结千问Prompt：

javascript
{
  model: 'qwen-plus-2025-07-28',
  messages: [
    {
      role: 'system',
      content: `你是一个美食数据总结助手。基于用户本月探店数据，生成简洁的月度总结。
                输出JSON格式：{"totalVisits": 数字, "avgRating": 数字, "topTags": ["标签1", "标签2"], "insight": "一句话总结", "musicSearchQuery": "歌曲名 歌手", "musicReason": "推荐理由"}
                示例输出：{"totalVisits": 12, "avgRating": 4.2, "topTags": ["火锅", "适合约会"], "insight": "本月最爱火锅，评分高达4.5分！", "musicSearchQuery": "Lucky Jason Mraz", "musicReason": "本月充满惊喜，就像这首歌一样轻快愉悦"}`
    },
    {
      role: 'user',
      content: `本月数据：探店${totalVisits}家，平均评分${avgRating}，常用标签${topTags.join(',')}，主导情绪${topMoodTags.join(',')}`
    }
  ]
}
输出示例：

json
{
  "totalVisits": 12,
  "avgRating": 4.2,
  "topTags": ["火锅", "适合约会", "上菜快"],
  "insight": "本月最爱火锅，评分高达4.5分！",
  "musicSearchQuery": "Lucky Jason Mraz",
  "musicReason": "本月充满惊喜，就像这首歌一样轻快愉悦"
}
4.6 共同回忆
共同回忆千问Prompt：

javascript
{
  model: 'qwen-plus-2025-07-28',
  messages: [
    {
      role: 'system',
      content: `你是一个美食社交助手。基于两个用户共同探店的记录，生成一段温暖的共同回忆文案和友谊主题曲推荐。
                输出JSON格式：{"insight": "一段温暖的文字", "musicSearchQuery": "歌曲名 歌手", "musicReason": "推荐理由"}
                示例输出：{"insight": "你们一起探了8家店，最爱的是火锅。美食是最好的友谊见证！", "musicSearchQuery": "最佳损友 陈奕迅", "musicReason": "这首歌送给你们——最好的美食搭子"}`
    },
    {
      role: 'user',
      content: `用户A：${userA}，用户B：${userB}，共同探店${totalCommonVisits}家，共同最爱店铺：${topCommonSpot}，共同偏好菜系：${commonCategories.join(',')}`
    }
  ]
}
输出示例：

json
{
  "insight": "你们一起探了8家店，最爱的是火锅。美食是最好的友谊见证！",
  "musicSearchQuery": "最佳损友 陈奕迅",
  "musicReason": "这首歌送给你们——最好的美食搭子"
}
4.7 相似店铺推荐
相似推荐千问Prompt：

javascript
{
  model: 'qwen-plus-2025-07-28',
  messages: [
    {
      role: 'system',
      content: `你是一个美食推荐助手。基于当前店铺的标签和用户的偏好，推荐3个相似店铺。
                输出JSON数组，格式：[{"name": "店铺名", "reason": "推荐理由", "matchScore": 0.95}]`
    },
    {
      role: 'user',
      content: `当前店铺：${spotName}，标签：${tags.join(',')}，菜系：${categories}
                用户历史偏好标签：${userHistoryTags.join(',')}
                可用店铺列表：${availableSpots.map(s => `${s.name}(${s.tags.join(',')})`).join(';')}`
    }
  ]
}
5. 数据模型设计
5.1 核心实体
typescript
// 用户
type User = {
  id: string;
  name: string;
  avatar?: string;
  spotifyConnected?: boolean;
  createdAt: string;
}

// 店铺点位（独立实体，存储店铺固有属性）
type Spot = {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  placeId?: string;         // 地图服务商ID，用于去重
  phone?: string;           // 联系电话（从高德API自动填充，缺失留空）
  businessHours?: string;   // 营业时间（从高德API自动填充，缺失留空）
  categories: string[];     // 菜系标签
  createdAt: string;
  createdBy: string;        // 首次创建的 userId
}

// 喜爱记录（用户对店铺的评价，不包含店铺固有属性）
type PrefRecord = {
  id: string;
  userId: string;
  spotId: string;           // 外键，关联到 Spot
  
  // 理性评价
  overall: number;          // 喜爱值评分 1-5
  
  // 感性记忆
  emoji?: string;           // 情绪Emoji（如 🥰 😌 🤔 😤）
  moodTag?: string;         // 情绪标签文字（如 "惊喜" "舒服" "一般" "踩雷"）
  
  // 店铺分类标签（qwen-plus-2025-07-28 推荐 + 用户自定义，用于语义化搜索）
  tags: string[];           // 如 ["适合约会", "环境优雅", "上菜快", "停车方便"]
  
  // 协作信息
  invitedBy?: string;        // 邀请者的userId（如果是被邀请添加的）
  isCollaborative: boolean;  // 是否为协作记录
  
  // 可选的多维度评分
  dimensions?: {
    taste: number;          // 口味 1-5
    ambiance: number;       // 氛围 1-5
    service: number;        // 服务 1-5
    value: number;          // 性价比 1-5
  };
  
  note?: string;
  images: string[];
  visitDate: string;
  visitCount: number;       // 用户到访此店的次数（随每次添加自动累加）
  createdAt: string;
  updatedAt: string;
}

// 协作邀请记录
type CollaborationInvite = {
  id: string;
  spotId: string;
  inviterId: string;       // 邀请人
  inviteeId: string;       // 被邀请人
  status: 'pending' | 'accepted' | 'declined';
  invitedAt: string;
  respondedAt?: string;
}

// AI总结（qwen-plus-2025-07-28 生成）
type AISummary = {
  id: string;
  userId: string;
  type: 'monthly' | 'yearly' | 'friendship';
  period: string;               // '2025-03' 或 '2025' 或 'userA_userB'
  content: {
    // 统计数据
    totalVisits: number;
    avgPrefValue: number;
    topSpots: Array<{ name: string; prefValue: number }>;
    // 情绪分析
    topMoodTags: string[];      // 本月/年主导情绪
    // 标签分析
    topTags: string[];           // 本月/年最常用的店铺分类标签
    tagCloud: Array<{ tag: string; count: number }>;  // 标签云
    // 协作统计
    collaborativeVisits?: number; // 共同探店的次数
    topCollaborativeSpots?: Array<{ name: string; participants: string[] }>;
    // AI生成的文案
    insight: string;             // qwen-plus-2025-07-28 生成的一句话总结
    // 其他
    emotionKeywords?: string[];
    achievements?: Array<{ name: string; earnedAt: string }>;
  };
  musicSearchQuery?: string;    // qwen-plus-2025-07-28 生成的音乐搜索词
  musicReason?: string;         // qwen-plus-2025-07-28 生成的推荐理由
  confirmedTrack?: {            // 用户确认后的歌曲
    spotifyId: string;
    name: string;
    artist: string;
    albumImage: string;
    previewUrl: string;
  };
  createdAt: string;
}

// 共享关系
type ShareMap = {
  id: string;
  ownerId: string;
  sharedWith: string;
  permission: 'view' | 'edit';
  createdAt: string;
}
5.2 核心API设计
接口	方法	描述
/api/spots	GET	获取视野范围内的点位
/api/spots	POST	创建新店铺点位
/api/poi/search	POST	调用高德POI API，获取店铺基础信息
/api/spots/{id}/prefs	GET	获取某店铺的所有用户喜爱记录
/api/spots/{id}/prefs	POST	添加/更新自己的喜爱记录
/api/ai/tags	POST	调用 qwen-plus-2025-07-28，根据笔记和评分推荐店铺分类标签
/api/ai/search/intent	POST	调用 qwen-plus-2025-07-28，语义化搜索意图解析
/api/ai/summary/monthly	GET	调用 qwen-plus-2025-07-28，生成月度总结（含音乐推荐）
/api/ai/summary/yearly	GET	调用 qwen-plus-2025-07-28，生成年度总结（含音乐推荐）
/api/ai/summary/friendship	GET	调用 qwen-plus-2025-07-28，生成共同回忆（含音乐推荐）
/api/ai/recommend	GET	调用 qwen-plus-2025-07-28，获取相似店铺推荐
/api/spotify/search	POST	用 qwen-plus-2025-07-28 生成的搜索词调用Spotify API
/api/collaboration/invite	POST	邀请好友一起记录店铺
/api/collaboration/invites	GET	获取待处理的协作邀请
/api/collaboration/invite/{id}/accept	POST	接受邀请，添加记录
/api/collaboration/invite/{id}/decline	POST	拒绝邀请
/api/maps/share	POST	共享地图给好友
/api/maps/{userId}/shared	GET	获取我被共享的地图列表
6. 技术难点与解决方案
难点	挑战描述	解决方案
地图性能	大量点位同时渲染导致卡顿	视野内按需加载 + 聚合显示
位置去重	同一家店被多人重复创建	保存placeId；创建新店前按坐标范围搜索是否已存在
协作冲突	多人同时添加喜爱记录	按用户隔离存储；显示时合并展示
千问API成本控制	API调用有免费额度限制	新用户100万Token免费额度，缓存总结结果，限制单日调用频率
千问API调用限制	免费版有并发和频率限制	前端防抖 + 后端Redis缓存 + 错误重试机制 + 降级方案
音乐服务依赖	Spotify API调用限制	降级方案：不可用时隐藏音乐功能
POI数据不全	高德API部分字段缺失	自动填充优先，缺失字段留空，不要求用户补充
地图服务调用次数限制	高德API每日调用配额有限	前端防抖节流 + 本地存储缓存 + 后端Redis缓存 + 配额监控 + 降级方案
语义化搜索准确性	自然语言到标签的映射准确性	标签体系规范化 + qwen-plus-2025-07-28 Prompt优化 + 降级全文搜索
协作邀请通知	用户可能错过邀请通知	通知中心 + 摘要式提醒，不弹窗打扰
隐私边界	用户不想暴露所有足迹	共享时可选择"仅共享部分标签/评分"；支持隐藏特定点位
7. 交互设计要点
地图即主页：打开应用就是地图，所有操作围绕地图展开

喜爱值视觉化：点位颜色/大小传递情感信息，一眼看懂

轻量记录：添加记录步骤控制在3步以内（长按 → 评分 → 可选照片 → 完成）

AI融入自然：店铺分类标签推荐以"✨推荐"标识出现，一键添加；语音输入使用浏览器原生API；总结以精美卡片呈现

三种标签各司其职：喜爱值评分（理性排序）、情绪标签（感性回忆）、店铺分类标签（语义搜索）

语义化搜索：支持自然语言，用户可输入"适合约会的安静餐厅"等口语化表达

协作不打扰：邀请好友是可选操作，通知采用摘要式，不弹窗打扰

多人记录可见：同一店铺有多人记录时，地图上显示参与人数，点击可展开每个人的记录

音乐有温度：总结报告中的音乐推荐附有推荐理由，用户可试听、换歌、确认

POI数据不强迫：自动填充优先，缺失字段留空，不要求用户补充

社交不打扰：采用摘要通知，避免实时刷屏

8. 差异化亮点总结
对比对象	他们的做法	TasteBridge 的做法
大众点评/美团	公共评分，陌生人为主，需跳转地图	个人喜爱值为主，地图即详情页
Google Maps 保存	仅保存位置，无深度记录	评分+笔记+照片+情绪标签+店铺分类标签一体化
小红书收藏	碎片化，难整理，无地理聚合	所有记录自动落位到地图，可视化沉淀
微信群分享	实时刷屏，打扰他人	异步协作，不打扰，可随时查看
传统记录工具	无AI辅助	qwen-plus-2025-07-28 AI标签推荐、语义搜索、智能总结
其他美食应用	关键词搜索	qwen-plus-2025-07-28 自然语言语义化搜索（如"适合约会的安静餐厅"）
其他美食应用	单人记录	多人协作记录，支持邀请同行好友
其他美食应用	无音乐功能	月度/年度/共同回忆都有qwen-plus-2025-07-28 推荐BGM，可试听、换歌
