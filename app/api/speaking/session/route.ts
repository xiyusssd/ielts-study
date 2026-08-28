import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { ai } from "@/lib/ai";
import { friendlyAIError } from "@/lib/ai/errors";
import { providerReady } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

/**
 * 签发 OpenAI Realtime API ephemeral token。
 * 前端拿到 client_secret 后用 WebRTC 直连 OpenAI（不经服务端中转音频）。
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  if (!providerReady("realtime")) {
    return NextResponse.json(
      { error: "Realtime provider 未配置。设置 OPENAI_API_KEY 后重启。" },
      { status: 400 },
    );
  }

  // 每个 token 都对应一段计费的实时通话，按用户限流（同 /api/tts、/api/vocab/gen-sentence）
  const rl = rateLimit(`realtime:${user.id}`, 10, 60_000); // 每人每分钟 10 次
  if (!rl.ok) {
    return NextResponse.json(
      { error: `开启口语会话过于频繁，请 ${Math.ceil(rl.resetInMs / 1000)} 秒后再试` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({} as { part?: number; instructions?: string }));
  const { part = 1, instructions } = body as { part?: number; instructions?: string };

  const systemInstructions = instructions ?? examinerInstructions(part as 1 | 2 | 3);

  try {
    const provider = ai("realtime");
    if (!provider.realtimeToken) {
      return NextResponse.json({ error: `${provider.name} 不支持 realtime` }, { status: 400 });
    }
    const token = await provider.realtimeToken({
      instructions: systemInstructions,
    });
    return NextResponse.json(token);
  } catch (err) {
    return NextResponse.json({ error: friendlyAIError(err) }, { status: 500 });
  }
}

function examinerInstructions(part: 1 | 2 | 3): string {
  const shared = `You are a friendly IELTS Speaking examiner. Speak naturally at a slow-to-medium pace. Use standard British or American English. Encourage the candidate but do not over-praise. Never grade during the session; grading happens afterward.`;

  if (part === 1) {
    return `${shared}\n\nThis is IELTS Speaking PART 1 (introduction and interview, 4-5 minutes). Ask 3-4 short personal questions on everyday topics (hometown, work/study, hobbies, food, technology). Each question should be simple and direct. Wait for the candidate to answer before moving on. If their answer is very short, ask one gentle follow-up. Do not lecture; ask questions.`;
  }
  if (part === 2) {
    return `${shared}\n\nThis is IELTS Speaking PART 2 (individual long turn, 3-4 minutes). Present a cue card topic to the candidate. Give them 1 minute of silent preparation time (just say "You have one minute to prepare" and wait). Then say "Please begin" and let them speak for 1-2 minutes. Only interrupt if they exceed 2 minutes. After they finish, ask ONE brief follow-up question.`;
  }
  return `${shared}\n\nThis is IELTS Speaking PART 3 (two-way discussion, 4-5 minutes). Ask abstract, discussion-style questions related to the Part 2 topic. Probe for reasoning: "why do you think that?", "can you give an example?". Push the candidate to develop ideas. Avoid yes/no questions.`;
}
