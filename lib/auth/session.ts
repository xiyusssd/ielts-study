import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { cache } from "react";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/db";

export type SessionData = {
  userId?: string;
  email?: string;
};

export function sessionOptions(): SessionOptions {
  const env = getEnv();
  return {
    password: env.SESSION_SECRET,
    cookieName: "ielts-study-session",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 天
    },
  };
}

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions());
}

/**
 * 当前登录用户（未登录返回 null）。
 *
 * 用 React cache 包一层：一次请求里布局、页面、各 server action 都会调它，
 * 不缓存等于每次都读 cookie + 查一遍 User 表。
 */
export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session.userId) {
    return null;
  }
  // 校验用户仍存在（防止重建库后旧 cookie 指向已删除用户，写外键时报错）
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true },
  });
  if (!user) return null;
  return { id: user.id, email: user.email };
});
