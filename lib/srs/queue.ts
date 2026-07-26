import { prisma } from "@/lib/db";

/**
 * 生成用户今日学习队列：先复习到期词，再补齐新词到目标数。
 *
 * 优先级：
 * 1. 逾期词（dueAt < now） → 立刻要复习
 * 2. 今日到期（dueAt 在今天内）
 * 3. 新词（用户尚未学过）— 按 level 从低到高（先易后难）
 *
 * @param newLimit  每日新词上限
 * @param reviewLimit  每日复习上限
 */
export async function generateDailyQueue(
  userId: string,
  opts: {
    newLimit?: number;
    reviewLimit?: number;
    targetLevel?: number;
    source?: string; // 词汇书来源筛选(如 ielts/cet6/awl)，新词只取该来源
    topic?: string; // 雅思话题筛选(如 environment)，新词只取该话题
  } = {},
) {
  const newLimit = opts.newLimit ?? 20;
  const reviewLimit = opts.reviewLimit ?? 100;
  const targetLevel = opts.targetLevel ?? 5000;

  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // 到期词（含逾期）
  const dueList = await prisma.vocabProgress.findMany({
    where: {
      userId,
      dueAt: { lte: endOfDay },
    },
    orderBy: { dueAt: "asc" },
    include: { word: true },
    take: reviewLimit,
  });

  // 已学词 id 集合，用于排除
  const learnedIds = new Set((await prisma.vocabProgress.findMany({
    where: { userId },
    select: { wordId: true },
  })).map((p) => p.wordId));

  // 新词：按 level ≤ target 优先，同 level 按拼写字母序
  // 可选按来源/话题筛选（tags 存 "ielts,cet6,t:environment,cefr:B2" 格式）
  const remaining = Math.max(0, newLimit);
  const tagFilters: { tags: { contains: string } }[] = [];
  if (opts.source) tagFilters.push({ tags: { contains: opts.source } });
  if (opts.topic) tagFilters.push({ tags: { contains: `t:${opts.topic}` } });
  const newWords = remaining > 0
    ? await prisma.word.findMany({
        where: {
          id: { notIn: Array.from(learnedIds) },
          level: { lte: Math.max(targetLevel, 3000) },
          ...(tagFilters.length ? { AND: tagFilters } : {}),
        },
        orderBy: [{ level: "asc" }, { spelling: "asc" }],
        take: remaining,
      })
    : [];

  return {
    dueList: dueList.map((p) => ({
      progressId: p.id,
      word: p.word,
      stability: p.stability,
      difficulty: p.difficulty,
      reps: p.reps,
      lapses: p.lapses,
      dueAt: p.dueAt,
      isNew: false as const,
    })),
    newList: newWords.map((w) => ({
      progressId: null,
      word: w,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      dueAt: now,
      isNew: true as const,
    })),
  };
}

export type QueueItem = Awaited<ReturnType<typeof generateDailyQueue>>["dueList"][number];
