"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserOrRedirect } from "@/lib/auth/require";
import { providerReady, getEnv } from "@/lib/env";
import { writingBand } from "@/lib/scoring/band-mapper";

/** 提交作文并触发 AI 批改（无 key 时降级到默认分） */
export async function submitEssay(input: {
  promptId: string;
  content: string;
  wordCount: number;
  duration: number;
}) {
  const user = await requireUserOrRedirect();

  const promptRec = await prisma.writingPrompt.findUnique({ where: { id: input.promptId } });
  if (!promptRec) throw new Error("题目不存在");

  const env = getEnv();
  const aiReady = providerReady("text") && !!env.OPENAI_API_KEY;

  type GradedShape = {
    scores: { tr: number; cc: number; lr: number; gra: number; overall?: number };
    feedback: string;
    paragraphComments: string[];
    corrections: { wrong: string; correct: string; explain: string }[];
  };

  let graded: GradedShape = {
    scores: { tr: 5.5, cc: 5.5, lr: 5.5, gra: 5.5 },
    feedback: "AI 批改暂未启用（未配置 API Key）。分数为占位。",
    paragraphComments: [],
    corrections: [],
  };
  let providerName: string | null = null;
  let modelName: string | null = null;

  if (aiReady) {
    try {
      const { gradeWriting } = await import("@/lib/ai/writing-grader");
      const { friendlyAIError } = await import("@/lib/ai/errors");
      try {
        const result = await gradeWriting({ prompt: promptRec.prompt, content: input.content });
        graded = result;
        providerName = env.AI_TEXT_PROVIDER;
        modelName = env.OPENAI_TEXT_MODEL;
      } catch (e) {
        graded.feedback = `${friendlyAIError(e)}。以下为占位分数，可稍后重新提交。`;
      }
    } catch {
      graded.feedback = "AI 批改暂时不可用，以下为占位分数。";
    }
  }

  const overall = writingBand(graded.scores);
  const submission = await prisma.writingSubmission.create({
    data: {
      userId: user.id,
      promptId: input.promptId,
      content: input.content,
      wordCount: input.wordCount,
      duration: input.duration,
      scores: JSON.stringify({ ...graded.scores, overall }),
      feedback: JSON.stringify({
        feedback: graded.feedback,
        paragraphComments: graded.paragraphComments,
        corrections: graded.corrections,
      }),
      provider: providerName,
      model: modelName,
    },
  });

  revalidatePath("/writing");
  revalidatePath(`/writing/submissions/${submission.id}`);
  redirect(`/writing/submissions/${submission.id}`);
}
