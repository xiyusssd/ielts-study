"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { schedule, type Grade } from "@/lib/srs/fsrs";
import { VOCAB_BOOK_IDS, normalizeDailyGoals } from "@/lib/vocab/config";

/** 锁定/切换学习词书。book=null 表示学全部词库。 */
export async function saveVocabBook(book: string | null) {
  const user = await requireUser();
  if (!user) return { ok: false as const, error: "未登录" };
  // 只接受白名单里的词书 id，或 null
  const value = book && VOCAB_BOOK_IDS.includes(book as (typeof VOCAB_BOOK_IDS)[number]) ? book : null;
  await prisma.profile.update({
    where: { userId: user.id },
    data: { vocabBook: value },
  });
  revalidatePath("/vocab");
  revalidatePath("/vocab/study");
  revalidatePath("/");
  return { ok: true as const };
}

/** 保存用户的每日词量偏好：新词数（50-100 滑块）+ 复习配比（1:2 / 1:3）。 */
export async function saveDailyGoals(input: { newWords: number; ratio: number }) {
  const user = await requireUser();
  if (!user) return { ok: false as const, error: "未登录" };
  const { newWords, ratio, reviewWords } = normalizeDailyGoals(input.newWords, input.ratio);
  await prisma.profile.update({
    where: { userId: user.id },
    data: { dailyNewWords: newWords, dailyReviewWords: reviewWords, reviewRatio: ratio },
  });
  revalidatePath("/vocab");
  revalidatePath("/vocab/study");
  revalidatePath("/plan");
  return { ok: true as const };
}

/** 错词来源：翻卡 / 单词拼写 / 句子拼写 / 听写。 */
export type MistakeSource = "study" | "spell" | "sentence" | "dictation";

/** 用户对一张卡的评分 → 更新 SRS 状态；没记牢（Again/Hard 或拼写答错）同步收集进错词本，供 AI 小故事取材。 */
export async function reviewWord(input: { wordId: string; grade: Grade; source?: MistakeSource; wrongAnswer?: string }) {
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

  // 错词收集：没记牢的词进错词本（AI 小故事从这里取"每次错了的词"）
  if (input.grade <= 1) {
    const now = new Date();
    const wrongAnswer = input.wrongAnswer?.trim().slice(0, 100) || null;
    await prisma.mistakeWord.upsert({
      where: { userId_wordId: { userId: user.id, wordId: input.wordId } },
      create: {
        userId: user.id,
        wordId: input.wordId,
        source: input.source ?? "study",
        wrongAnswer,
        count: 1,
        lastWrongAt: now,
      },
      update: {
        count: { increment: 1 },
        lastWrongAt: now,
        mastered: false,
        ...(wrongAnswer ? { wrongAnswer } : {}),
      },
    });
  }

  revalidatePath("/vocab");
  revalidatePath("/vocab/mistakes");
  revalidatePath("/");
  return { ok: true as const, intervalDays: result.intervalDays, nextDue: result.dueAt.toISOString() };
}
