/**
 * 从 request 中读取 userId。
 * MVP 阶段：先尝试读 x-user-id header，再退化到固定开发用户 ID。
 */
import { DEV_USER_ID } from "@/lib/constants/user";

export async function getRequestUserId(request: Request): Promise<string> {
  const header = request.headers.get("x-user-id");
  if (header && header.trim().length > 0) return header.trim();
  return DEV_USER_ID;
}
