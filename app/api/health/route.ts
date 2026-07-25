import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { providerReady, getEnv } from "@/lib/env";

const bootTime = Date.now();

/**
 * 增强健康检查：DB · Providers · Uptime · 数据统计
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    time: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - bootTime) / 1000),
  };

  try {
    getEnv();
    checks.env = "ok";
  } catch (e) {
    return NextResponse.json({ ok: false, ...checks, env: (e as Error).message }, { status: 500 });
  }

  // DB 探活 + 关键统计
  try {
    const t0 = Date.now();
    const [userCount, wordCount] = await Promise.all([
      prisma.user.count(),
      prisma.word.count(),
    ]);
    checks.db = {
      status: "ok",
      latencyMs: Date.now() - t0,
      users: userCount,
      words: wordCount,
    };
  } catch (e) {
    return NextResponse.json(
      { ok: false, ...checks, db: { status: "error", error: (e as Error).message } },
      { status: 500 },
    );
  }

  checks.providers = {
    text: providerReady("text"),
    voice: providerReady("voice"),
    stt: providerReady("stt"),
    realtime: providerReady("realtime"),
  };

  return NextResponse.json({ ok: true, ...checks });
}
