import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

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

export async function requireUser() {
  const session = await getSession();
  if (!session.userId) {
    return null;
  }
  return { id: session.userId, email: session.email! };
}
