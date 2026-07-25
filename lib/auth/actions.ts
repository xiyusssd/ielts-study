"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// 密码策略：至少 8 位 + 必须包含字母和数字
const passwordSchema = z
  .string()
  .min(8, "密码至少 8 位")
  .max(200, "密码过长")
  .refine((s) => /[a-zA-Z]/.test(s), "密码必须包含字母")
  .refine((s) => /[0-9]/.test(s), "密码必须包含数字");

const credsSchema = z.object({
  email: z.string().email("邮箱格式不正确").max(200),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确").max(200),
  // 登录不做复杂度校验（旧密码可能不满足新策略）
  password: z.string().min(1, "请输入密码").max(200),
});

export type AuthResult = { ok: true } | { ok: false; error: string };

async function checkRateLimit(action: string, limit: number, windowMs: number): Promise<string | null> {
  const h = await headers();
  const ip = getClientIp(h);
  const rl = rateLimit(`${action}:${ip}`, limit, windowMs);
  if (!rl.ok) {
    const s = Math.ceil(rl.resetInMs / 1000);
    return `尝试过于频繁，请 ${s} 秒后再试`;
  }
  return null;
}

export async function signup(formData: FormData): Promise<AuthResult> {
  const rlErr = await checkRateLimit("signup", 5, 60_000); // 每 IP 每分钟 5 次
  if (rlErr) return { ok: false, error: rlErr };

  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "输入无效" };
  }
  const { email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "该邮箱已注册" };

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, profile: { create: {} } },
  });
  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  await session.save();
  redirect("/assessment");
}

export async function login(formData: FormData): Promise<AuthResult> {
  const rlErr = await checkRateLimit("login", 10, 60_000); // 每 IP 每分钟 10 次
  if (rlErr) return { ok: false, error: rlErr };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "输入无效" };
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  // 无论用户是否存在，都跑一遍 bcrypt 防 timing 攻击
  const validHash = user?.passwordHash ?? "$2a$10$abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz";
  const ok = await bcrypt.compare(password, validHash);
  if (!user || !ok) {
    return { ok: false, error: "邮箱或密码不正确" };
  }

  const session = await getSession();
  // 会话固定预防：登录时始终 destroy + 新建
  session.destroy();
  const newSession = await getSession();
  newSession.userId = user.id;
  newSession.email = user.email;
  await newSession.save();
  redirect("/");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
