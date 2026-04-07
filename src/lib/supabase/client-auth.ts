/**
 * 生成客户端请求头（MVP 阶段仅附加固定用户 ID）。
 */
import { DEV_USER_ID } from "@/lib/constants/user";

export function getAuthHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "x-user-id": DEV_USER_ID,
  };
}
