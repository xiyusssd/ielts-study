import { prisma } from "@/lib/db";
import { DEFAULT_DAILY_NEW, DEFAULT_DAILY_REVIEW } from "@/lib/vocab/config";

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
    requireExamples?: boolean; // 句子拼写用：新词只取带例句的（全库仅少量词有例句）
    bookId?: string; // 词书学习：新词/复习词都限定在该书的 ChapterWord 内
    mistakes?: boolean; // 错词复习：新词取未掌握错词
    favorites?: boolean; // 生词本学习：新词取收藏词
  } = {},
) {
  const newLimit = opts.newLimit ?? DEFAULT_DAILY_NEW;
  const reviewLimit = opts.reviewLimit ?? DEFAULT_DAILY_REVIEW;
  const targetLevel = opts.targetLevel ?? 5000;

  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // 词书内单词（按 章节序 → 章内序 排好），用于限定队列范围并保持学习顺序
  const bookWords = opts.bookId
    ? await prisma.chapterWord.findMany({
        where: { chapter: { bookId: opts.bookId } },
        select: { wordId: true },
        orderBy: [{ chapter: { index: "asc" } }, { index: "asc" }],
      })
    : null;
  const bookWordIds = bookWords ? bookWords.map((b) => b.wordId) : null;

  // 错词/生词本：新词范围
  const scopeWordIds = opts.mistakes
    ? (await prisma.mistakeWord.findMany({
        where: { userId, mastered: false },
        select: { wordId: true },
        orderBy: { lastWrongAt: "desc" },
      })).map((m) => m.wordId)
    : opts.favorites
      ? (await prisma.favoriteWord.findMany({
          where: { userId },
          select: { wordId: true },
          orderBy: { createdAt: "desc" },
        })).map((f) => f.wordId)
      : null;

  // 到期词（含逾期）。词书模式只复习书内的词
  const dueList = await prisma.vocabProgress.findMany({
    where: {
      userId,
      dueAt: { lte: endOfDay },
      ...(bookWordIds ? { wordId: { in: bookWordIds } } : {}),
    },
    orderBy: { dueAt: "asc" },
    include: { word: true },
    take: reviewLimit,
  });

  // 已学词 id 集合，用于排除
  const learnedIds = new Set(
    (
      await prisma.vocabProgress.findMany({
        where: { userId },
        select: { wordId: true },
      })
    ).map((p) => p.wordId),
  );

  // 新词范围：词书 / 错词 / 生词本 / 来源话题标签，四选一
  const newScope: "book" | "scope" | "tags" | "all" = bookWordIds
    ? "book"
    : scopeWordIds
      ? "scope"
      : opts.source || opts.topic
        ? "tags"
        : "all";

  const tagFilters: { tags: { contains: string } }[] = [];
  if (opts.source) tagFilters.push({ tags: { contains: opts.source } });
  if (opts.topic) tagFilters.push({ tags: { contains: `t:${opts.topic}` } });

  const newWords =
    newLimit <= 0
      ? []
      : newScope === "book" && bookWordIds
        ? await (async () => {
            const fresh = bookWordIds.filter((id) => !learnedIds.has(id)).slice(0, newLimit);
            if (fresh.length === 0) return [];
            const rows = await prisma.word.findMany({ where: { id: { in: fresh } } });
            // 按词书章节顺序还原
            const byId = new Map(rows.map((w) => [w.id, w]));
            return fresh.map((id) => byId.get(id)).filter((w): w is NonNullable<typeof w> => !!w);
          })()
        : newScope === "scope" && scopeWordIds
          ? await (async () => {
              const fresh = scopeWordIds.filter((id) => !learnedIds.has(id)).slice(0, newLimit);
              if (fresh.length === 0) return [];
              const rows = await prisma.word.findMany({ where: { id: { in: fresh } } });
              const byId = new Map(rows.map((w) => [w.id, w]));
              return fresh.map((id) => byId.get(id)).filter((w): w is NonNullable<typeof w> => !!w);
            })()
          : await prisma.word.findMany({
              where: {
                id: { notIn: Array.from(learnedIds) },
                level: { lte: Math.max(targetLevel, 3000) },
                ...(tagFilters.length ? { AND: tagFilters } : {}),
                // 句子拼写：只取带例句的词（否则按 level 抽的新词过滤后基本为空）
                ...(opts.requireExamples ? { examples: { notIn: ["", "[]"] } } : {}),
              },
              orderBy: [{ level: "asc" }, { spelling: "asc" }],
              take: newLimit,
            });

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