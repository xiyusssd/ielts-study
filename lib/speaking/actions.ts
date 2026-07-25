"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserOrRedirect } from "@/lib/auth/require";
import { providerReady, getEnv } from "@/lib/env";
import { speakingBand } from "@/lib/scoring/band-mapper";

export type SessionTurn = { role: "examiner" | "candidate"; text: string; ts: number };

export async function submitSpeakingSession(input: {
  part: 1 | 2 | 3;
  promptIds: string[];
  transcript: SessionTurn[];
  skipped?: boolean;
}) {
  const user = await requireUserOrRedirect();

  const env = getEnv();
  const candidateText = input.transcript
    .filter((t) => t.role === "candidate")
    .map((t) => t.text)
    .join("\n\n");

  let scores = { fluency: 5.5, vocabulary: 5.5, grammar: 5.5, pronunciation: 5.5 };
  let feedbackText = input.skipped
    ? "已跳过口语。"
    : "AI 评分暂未启用（未配置 API Key），占位分。";
  let strengths: string[] = [];
  let improvements: string[] = [];
  let providerName: string | null = null;
  let modelName: string | null = null;

  if (!input.skipped && candidateText.trim() && providerReady("text") && env.OPENAI_API_KEY) {
    try {
      const { gradeSpeaking } = await import("@/lib/ai/speaking-grader");
      const result = await gradeSpeaking({ transcript: candidateText });
      scores = result.scores;
      feedbackText = result.feedback;
      strengths = result.strengths;
      improvements = result.improvements;
      providerName = env.AI_TEXT_PROVIDER;
      modelName = env.OPENAI_TEXT_MODEL;
    } catch (e) {
      feedbackText = `AI 评分失败：${(e as Error).message.slice(0, 300)}`;
    }
  }

  const overall = input.skipped ? 5.5 : speakingBand(scores);

  const session = await prisma.speakingSession.create({
    data: {
      userId: user.id,
      part: input.part,
      promptIds: JSON.stringify(input.promptIds),
      transcript: JSON.stringify(input.transcript),
      scores: JSON.stringify({ ...scores, overall }),
      feedback: JSON.stringify({
        feedback: feedbackText,
        strengths,
        improvements,
      }),
      provider: providerName,
      model: modelName,
    },
  });

  revalidatePath("/speaking");
  redirect(`/speaking/sessions/${session.id}`);
}
