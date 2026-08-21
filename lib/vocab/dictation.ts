"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export type DictationScope = "book" | "chapter" | "mistakes" | "favorites" | "random";
export type DictationMistake = { wordId: string; wrongAnswer: string };

export type DictationResult =
  | { ok: true; attemptId: string; accuracy: number }
  | { ok: false; error: string };

/**
 * 提交一轮听写结果：落 DictationAttempt + 错词收集进 MistakeWord。
 *
 * 错词 upsert（count 累加、lastWrongAt 刷新、mastered 清零）。
 * scope=mistakes 的错词重练里，答对的词由 correctWordIds 提供并置为已掌握。
 */
export async function finishDictation(input: {
  scope: DictationScope;
  scopeId?: string | null;
  total: number;
  correct: number;
  duration: number; // 秒
  mistakes: DictationMistake[];
  correctWordIds?: string[];
}): Promise<DictationResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };

  const total = Math.max(1, Math.round(input.total));
  const correct = Math.max(0, Math.min(total, Math.round(input.correct)));
  const accuracy = total > 0 ? correct / total : 0;
  const mistakeList = (input.mistakes ?? []).slice(0, total);
  const now = new Date();

  const attemptId = await prisma.$transaction(async (tx) => {
    const attempt = await tx.dictationAttempt.create({
      data: {
        userId: user.id,
        scope: input.scope,
        scopeId: input.scopeId ?? null,
        total,
        correct,
        accuracy,
        duration: Math.max(0, Math.round(input.duration)),
        mistakes: JSON.stringify(mistakeList.map((m) => m.wordId)),
      },
    });

    for (const m of mistakeList) {
      const wrongAnswer = m.wrongAnswer.slice(0, 100) || null;
      const existing = await tx.mistakeWord.findUnique({
        where: { userId_wordId: { userId: user.id, wordId: m.wordId } },
      });
      if (existing) {
        await tx.mistakeWord.update({
          where: { id: existing.id },
          data: {
            count: existing.count + 1,
            lastWrongAt: now,
            mastered: false,
            wrongAnswer: wrongAnswer ?? existing.wrongAnswer,
          },
        });
      } else {
        await tx.mistakeWord.create({
          data: { userId: user.id, wordId: m.wordId, source: "dictation", wrongAnswer, count: 1 },
        });
      }
    }

    if (input.scope === "mistakes" && input.correctWordIds?.length) {
      await tx.mistakeWord.updateMany({
        where: { userId: user.id, wordId: { in: input.correctWordIds } },
        data: { mastered: true },
      });
    }

    return attempt.id;
  });

  revalidatePath("/vocab");
  revalidatePath("/vocab/mistakes");
  revalidatePath("/vocab/dictation");
  return { ok: true, attemptId, accuracy };
}