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

/**
 * 用户对一张卡的评分 → 更新 SRS 状态；真的答错才收集进错词本（供错词复习与 AI 小故事取材）。
 *
 * `mistake` 由调用方显式给出：拼写类模式传「是否拼错」，翻卡传「是否 Again」。
 * 不传则回落到 grade===0。这样「拼对但看了提示」（降级为 Hard）不会被误记成错词。
 *
 * 注意：这里不做 revalidatePath —— 每张卡都刷一次会重跑整条今日队列，
 * 还会把正在进行的会话队列算空。计数由会话结束时的 finishVocabSession 统一刷新。
 */
export async function reviewWord(input: {
  wordId: string;
  grade: Grade;
  source?: MistakeSource;
  wrongAnswer?: string;
  mistake?: boolean;
}) {
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

  // 错词收集：真的答错才进错词本（AI 小故事从这里取"每次错了的词"）
  const isMistake = input.mistake ?? input.grade === 0;
  if (isMistake) {
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
  } else if (input.grade >= 2) {
    // 错词复习里答对 → 标记已掌握，错词本会自然收敛（与听写链路同口径）
    await prisma.mistakeWord.updateMany({
      where: { userId: user.id, wordId: input.wordId, mastered: false },
      data: { mastered: true },
    });
  }

  return { ok: true as const, intervalDays: result.intervalDays, nextDue: result.dueAt.toISOString() };
}

/**
 * 一轮背词会话结束后刷新受影响页面的计数（词汇首页 / 错词本 / 生词本 / Dashboard）。
 *
 * 单独拆出来是因为 next.config 开了 staleTimes.dynamic=30：不刷新的话返回词汇首页
 * 最多 30 秒看到旧数字；而放在每张卡里刷又会打断会话（见 reviewWord 注释）。
 */
export async function finishVocabSession() {
  revalidatePath("/vocab");
  revalidatePath("/vocab/mistakes");
  revalidatePath("/vocab/favorites");
  revalidatePath("/");
  return { ok: true as const };
}
