import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { providerReady } from "@/lib/env";
import { ai } from "@/lib/ai";
import { friendlyAIError } from "@/lib/ai/errors";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/** 文本转语音(真人级)。语音能力走 ai("voice") 抽象层，未配置时前端自行降级到浏览器合成音。 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  if (!providerReady("voice")) {
    return NextResponse.json({ error: "语音 AI 未配置" }, { status: 503 });
  }

  const ip = getClientIp(req.headers);
  const rl = rateLimit(`tts:${ip}`, 60, 60_000); // 每 IP 每分钟 60 次
  if (!rl.ok) {
    return NextResponse.json(
      { error: `请求过于频繁，请 ${Math.ceil(rl.resetInMs / 1000)} 秒后再试` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({} as { text?: string; voice?: string }));
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 2000) : "";
  if (!text) return NextResponse.json({ error: "缺少 text" }, { status: 400 });

  try {
    const audio = await ai("voice").tts!(text, { voice: body.voice, format: "mp3" });
    return new NextResponse(Buffer.from(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: friendlyAIError(err) }, { status: 500 });
  }
}
