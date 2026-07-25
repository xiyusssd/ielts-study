import { prisma } from "@/lib/db";

/**
 * 记录 AI 调用到 AILog 表 · 用于成本分析和排障。
 * 失败不阻塞主流程。
 */
export async function logAI(entry: {
  userId?: string;
  provider: string;
  model: string;
  kind: "chat" | "tts" | "stt" | "realtime";
  purpose: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
}) {
  try {
    await prisma.aILog.create({
      data: {
        userId: entry.userId ?? null,
        provider: entry.provider,
        model: entry.model,
        kind: entry.kind,
        purpose: entry.purpose,
        inputTokens: entry.inputTokens ?? null,
        outputTokens: entry.outputTokens ?? null,
        latencyMs: entry.latencyMs,
        ok: entry.ok,
        error: entry.error?.slice(0, 500) ?? null,
      },
    });
  } catch (e) {
    console.warn("[ai-log] failed:", (e as Error).message);
  }
}
