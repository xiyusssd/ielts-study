import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

/**
 * server action 里用：未登录直接 redirect 到 login。
 * 比 throw new Error("未登录") UX 好——用户不会看到红色错误弹窗。
 */
export async function requireUserOrRedirect() {
  const user = await requireUser();
  if (!user) redirect("/login");
  return user;
}
