import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { providerReady } from "@/lib/env";
import { generateExampleSentence, type SentenceLevel } from "@/lib/ai/content-gen";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/** 为一个单词现场生成新例句(句子拼写"换 AI 句")。文本走 airouter。 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  if (!providerReady("text")) {
    return NextResponse.json(
      { error: "文本 AI 未配置，无法生成例句。" },
      { status: 503 },
    );
  }

  const ip = getClientIp(req.headers);
  const rl = rateLimit(`gen-sentence:${ip}`, 20, 60_000); // 每 IP 每分钟 20 次
  if (!rl.ok) {
    return NextResponse.json(
      { error: `请求过于频繁，请 ${Math.ceil(rl.resetInMs / 1000)} 秒后再试` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({} as { word?: string; level?: string }));
  const word = typeof body.word === "string" ? body.word.trim().slice(0, 64) : "";
  const level: SentenceLevel = body.level === "easy" ? "easy" : "standard";
  if (!word) return NextResponse.json({ error: "缺少 word" }, { status: 400 });

  try {
    const sentence = await generateExampleSentence(word, level);
    return NextResponse.json(sentence);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
