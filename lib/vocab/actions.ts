"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { schedule, type Grade } from "@/lib/srs/fsrs";

/** 用户对一张卡的评分 → 更新 SRS 状态 */
export async function reviewWord(input: { wordId: string; grade: Grade }) {
  const user = await requireUser();
  if (!user) return { ok: false as const, error: "未登录" };

  const existing = await prisma.vocabProgress.findUnique({
    where: { userId_wordId: { userId: user.id, wordId: input.wordId } },
  });

  const state = existing
    ? {
        stability: existing.stability,
        difficulty: existing.difficulty,
        reps: existing.reps,
        lapses: existing.lapses,
      }
    : { stability: 0, difficulty: 0, reps: 0, lapses: 0 };

  const result = schedule(state, input.grade);

  if (existing) {
    await prisma.vocabProgress.update({
      where: { id: existing.id },
      data: {
        stability: result.stability,
        difficulty: result.difficulty,
        reps: result.reps,
        lapses: result.lapses,
        dueAt: result.dueAt,
        lastGrade: input.grade,
      },
    });
  } else {
    await prisma.vocabProgress.create({
      data: {
        userId: user.id,
        wordId: input.wordId,
        stability: result.stability,
        difficulty: result.difficulty,
        reps: result.reps,
        lapses: result.lapses,
        dueAt: result.dueAt,
        lastGrade: input.grade,
      },
    });
  }

  revalidatePath("/vocab");
  revalidatePath("/");
  return { ok: true as const, intervalDays: result.intervalDays, nextDue: result.dueAt.toISOString() };
}
