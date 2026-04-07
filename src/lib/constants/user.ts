/** MVP：未接登录前，写入 spots.created_by 的占位用户 */
export const DEV_USER_ID =
  process.env.NEXT_PUBLIC_DEV_USER_ID?.trim() || "dev-1";
