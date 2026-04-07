/**
 * 简单解析营业时间字符串，判断当前是否营业中。
 * 支持「10:00-22:00」「10:00~22:00」「10:00–22:00」等格式。
 * 无法解析时返回 'unknown'。
 */
export function isOpenNow(
  businessHours: string | undefined,
): "open" | "closed" | "unknown" {
  if (!businessHours) return "unknown";
  // 尝试提取第一个时间区间
  const match = businessHours.match(
    /(\d{1,2}):(\d{2})\s*[-~\u2013\u2014\u81f3]\s*(\d{1,2}):(\d{2})/,
  );
  if (!match) return "unknown";
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = parseInt(match[1]) * 60 + parseInt(match[2]);
  let close = parseInt(match[3]) * 60 + parseInt(match[4]);
  if (close <= open) close += 24 * 60; // 跨午夜
  return cur >= open && cur <= close ? "open" : "closed";
}
