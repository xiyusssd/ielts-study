import { prisma } from "@/lib/db";
import type { Word } from "@prisma/client";
import { DEFAULT_DAILY_NEW, DEFAULT_DAILY_REVIEW } from "@/lib/vocab/config";

export type QueueItem = {
  progressId: string | null;
  word: Word;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  dueAt: Date;
  isNew: boolean;
};

export type DailyQueue = { dueList: QueueItem[]; newList: QueueItem[] };

export type QueueOptions = {
  newLimit?: number;
  reviewLimit?: number;
  targetLevel?: number;
  source?: string; // 词汇书来源筛选(如 ielts/cet6/awl)，新词只取该来源
  topic?: string; // 雅思话题筛选(如 environment)，新词只取该话题
  requireExamples?: boolean; // 句子拼写用：新词只取带例句的（全库仅少量词有例句）
  bookId?: string; // 词书学习：新词/复习词都限定在该书的 ChapterWord 内
  mistakes?: boolean; // 错词复习：过一遍未掌握错词
  favorites?: boolean; // 生词本学习：过一遍收藏词
};

/**
 * 生成用户今日学习队列：先复习到期词，再补齐新词到目标数。
 *
 * 优先级：
 * 1. 逾期词（dueAt < now） → 立刻要复习
 * 2. 今日到期（dueAt 在今天内）
 * 3. 新词（用户尚未学过）— 按 level 从低到高（先易后难）
 *
 * 例外：错词复习 / 生词本是"把这批词现在过一遍"，不看到期时间也不看是否学过。
 */
export async function generateDailyQueue(userId: string, opts: QueueOptions = {}): Promise<DailyQueue> {
  const newLimit = opts.newLimit ?? DEFAULT_DAILY_NEW;
  const reviewLimit = opts.reviewLimit ?? DEFAULT_DAILY_REVIEW;
  const targetLevel = opts.targetLevel ?? 5000;

  const now = new Date();
  const endOfDay = endOfToday();

  // 错词/生词本：独立取词逻辑（不能走"新词"分支，那里会按已学过过滤，见 scopeQueue 注释）
  if (opts.mistakes || opts.favorites) {
    const ids = await scopeWordIds(userId, opts.mistakes ? "mistakes" : "favorites");
    return scopeQueue(userId, ids.slice(0, Math.max(1, newLimit)), now);
  }

  // 词书内单词（按 章节序 → 章内序 排好），用于限定队列范围并保持学习顺序
  const bookWordIds = opts.bookId
    ? (
        await prisma.chapterWord.findMany({
          where: { chapter: { bookId: opts.bookId } },
          select: { wordId: true },
          orderBy: [{ chapter: { index: "asc" } }, { index: "asc" }],
        })
      ).map((b) => b.wordId)
    : null;

  // 到期词（含逾期）。词书模式只复习书内的词
  const dueRows =
    reviewLimit <= 0
      ? []
      : await prisma.vocabProgress.findMany({
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

  const tagFilters: { tags: { contains: string } }[] = [];
  if (opts.source) tagFilters.push({ tags: { contains: opts.source } });
  if (opts.topic) tagFilters.push({ tags: { contains: `t:${opts.topic}` } });

  let newWords: Word[] = [];
  if (newLimit > 0 && bookWordIds) {
    // 词书模式：按章节顺序取尚未学过的词
    const fresh = bookWordIds.filter((id) => !learnedIds.has(id)).slice(0, newLimit);
    newWords = await wordsInOrder(fresh);
  } else if (newLimit > 0) {
    newWords = await prisma.word.findMany({
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
  }

  return {
    dueList: dueRows.map((p) => ({
      progressId: p.id,
      word: p.word,
      stability: p.stability,
      difficulty: p.difficulty,
      reps: p.reps,
      lapses: p.lapses,
      dueAt: p.dueAt,
      isNew: false,
    })),
    newList: newWords.map((w) => ({
      progressId: null,
      word: w,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      dueAt: now,
      isNew: true,
    })),
  };
}

/**
 * 只算今日队列的两个数字（词汇首页用），不取整行单词。
 *
 * 首页此前直接调 generateDailyQueue 拿 length：会把最多 100 行 Word 全字段
 * （含 story/derivatives）拉进内存，还要拿全部已学 id 做 `notIn` 全表扫。
 */
export async function countDailyQueue(
  userId: string,
  opts: Pick<QueueOptions, "newLimit" | "reviewLimit" | "targetLevel" | "source"> = {},
): Promise<{ due: number; fresh: number }> {
  const newLimit = opts.newLimit ?? DEFAULT_DAILY_NEW;
  const reviewLimit = opts.reviewLimit ?? DEFAULT_DAILY_REVIEW;
  const targetLevel = Math.max(opts.targetLevel ?? 5000, 3000);

  const [dueTotal, freshRows] = await Promise.all([
    prisma.vocabProgress.count({ where: { userId, dueAt: { lte: endOfToday() } } }),
    // NOT EXISTS 走 VocabProgress(userId,wordId) 唯一索引，比把全部已学 id 传进 notIn 便宜
    prisma.$queryRawUnsafe<{ c: bigint | number }[]>(
      `SELECT COUNT(*) AS c FROM (
         SELECT w.id FROM Word w
         WHERE w.level <= ?
           ${opts.source ? "AND w.tags LIKE '%' || ? || '%'" : ""}
           AND NOT EXISTS (
             SELECT 1 FROM VocabProgress vp WHERE vp.wordId = w.id AND vp.userId = ?
           )
         LIMIT ?
       )`,
      ...(opts.source
        ? [targetLevel, opts.source, userId, Math.max(0, newLimit)]
        : [targetLevel, userId, Math.max(0, newLimit)]),
    ),
  ]);

  return {
    due: Math.min(dueTotal, Math.max(0, reviewLimit)),
    fresh: Number(freshRows[0]?.c ?? 0),
  };
}

/**
 * 错词复习 / 生词本：把范围内的词直接排成一队。
 *
 * 不能复用"新词"分支——那里按 `learnedIds` 过滤，而错词一定已有 VocabProgress 行
 * （拼错时 reviewWord 会建行），过滤后必然为空，页面就永远显示"暂无新词"。
 * 到期时间同理：刚拼错的词 dueAt 在未来，按到期查也取不到。
 */
async function scopeQueue(userId: string, ids: string[], now: Date): Promise<DailyQueue> {
  if (ids.length === 0) return { dueList: [], newList: [] };
  const [words, progressRows] = await Promise.all([
    wordsInOrder(ids),
    prisma.vocabProgress.findMany({ where: { userId, wordId: { in: ids } } }),
  ]);
  const progressByWord = new Map(progressRows.map((p) => [p.wordId, p]));
  return {
    dueList: words.map((word) => {
      const p = progressByWord.get(word.id);
      return {
        progressId: p?.id ?? null,
        word,
        stability: p?.stability ?? 0,
        difficulty: p?.difficulty ?? 0,
        reps: p?.reps ?? 0,
        lapses: p?.lapses ?? 0,
        dueAt: p?.dueAt ?? now,
        isNew: !p,
      };
    }),
    newList: [],
  };
}

/** 未掌握错词（最近错的排前）/ 收藏词（最近收藏排前）的 wordId 列表。 */
async function scopeWordIds(userId: string, kind: "mistakes" | "favorites"): Promise<string[]> {
  if (kind === "mistakes") {
    const rows = await prisma.mistakeWord.findMany({
      where: { userId, mastered: false },
      select: { wordId: true },
      orderBy: { lastWrongAt: "desc" },
    });
    return rows.map((r) => r.wordId);
  }
  const rows = await prisma.favoriteWord.findMany({
    where: { userId },
    select: { wordId: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => r.wordId);
}

/** 按传入 id 顺序取词（findMany 不保证顺序，词书/错词的排序要靠这一步还原）。 */
async function wordsInOrder(ids: string[]): Promise<Word[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.word.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((w) => [w.id, w]));
  return ids.map((id) => byId.get(id)).filter((w): w is Word => !!w);
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}