"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { requireUserOrRedirect } from "@/lib/auth/require";

const changePasswordSchema = z.object({
  current: z.string().min(1, "请输入当前密码"),
  next: z.string()
    .min(8, "新密码至少 8 位")
    .max(200)
    .refine((s) => /[a-zA-Z]/.test(s), "需包含字母")
    .refine((s) => /[0-9]/.test(s), "需包含数字"),
});

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function changePassword(formData: FormData): Promise<ActionResult> {
  const user = await requireUserOrRedirect();
  const parsed = changePasswordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "输入无效" };

  const row = await prisma.user.findUnique({ where: { id: user.id } });
  if (!row) return { ok: false, error: "用户不存在" };

  const ok = await bcrypt.compare(parsed.data.current, row.passwordHash);
  if (!ok) return { ok: false, error: "当前密码不正确" };

  const passwordHash = await bcrypt.hash(parsed.data.next, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { ok: true, message: "密码已更新" };
}

const deleteAccountSchema = z.object({
  confirm: z.string(),
});

export async function deleteAccount(formData: FormData): Promise<ActionResult> {
  const user = await requireUserOrRedirect();
  const parsed = deleteAccountSchema.safeParse({ confirm: formData.get("confirm") });
  if (!parsed.success || parsed.data.confirm !== user.email) {
    return { ok: false, error: "请准确输入邮箱以确认删除" };
  }

  // 事务级联删除（Prisma schema 已声明 onDelete: Cascade）
  await prisma.user.delete({ where: { id: user.id } });
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
