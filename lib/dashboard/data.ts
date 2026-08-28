import { prisma } from "@/lib/db";

/** 趋势图最多取最近 N 次做题/提交（图上塞更多点也看不清） */
const TREND_WINDOW = 60;
/** streak 只需要最近 N 天的活动日期 */
const STREAK_WINDOW_DAYS = 60;

/**
 * 拉取 dashboard 需要的聚合数据。
 *
 * 统计口径：计数/最高分走聚合查询（不受列表 take 影响），
 * 趋势图与活动日历只取最近一段时间的明细。
 * 早期实现用「最旧 100 条 attempt」既算计数又算趋势，做题超过 100 次后
 * 首页数字和曲线就停在历史某一刻不动了。
 */
export async function getDashboardData(userId: string) {
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - STREAK_WINDOW_DAYS);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const [
    profile,
    latestAssessment,
    plan,
    vocabTotal,
    vocabDueToday,
    passageModules,
    attemptGroups,
    recentAttempts,
    writingCount,
    recentWritings,
    speakingCount,
    recentSpeakings,
    attemptDays,
    writingDays,
    speakingDays,
    vocabDays,
  ] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.assessment.findFirst({
      where: { userId, type: "initial" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findUnique({
      where: { userId },
      include: {
        weeks: {
          orderBy: { weekIndex: "asc" },
          include: { tasks: { orderBy: { date: "asc" } } },
        },
      },
    }),
    prisma.vocabProgress.count({ where: { userId } }),
    prisma.vocabProgress.count({ where: { userId, dueAt: { lte: endOfToday } } }),
    // Attempt 表没有到 Passage 的关系字段，模块归属靠这张小表(百来行)在内存里映射
    prisma.passage.findMany({ select: { id: true, module: true } }),
    prisma.attempt.groupBy({
      by: ["passageId"],
      where: { userId },
      _count: { _all: true },
      _max: { band: true },
    }),
    prisma.attempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: TREND_WINDOW,
      select: { id: true, passageId: true, band: true, score: true, createdAt: true },
    }),
    prisma.writingSubmission.count({ where: { userId } }),
    prisma.writingSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: TREND_WINDOW,
      select: { id: true, scores: true, createdAt: true },
    }),
    prisma.speakingSession.count({ where: { userId } }),
    prisma.speakingSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: TREND_WINDOW,
      select: { id: true, scores: true, createdAt: true },
    }),
    prisma.attempt.findMany({ where: { userId, createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.writingSubmission.findMany({ where: { userId, createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.speakingSession.findMany({ where: { userId, createdAt: { gte: since } }, select: { createdAt: true } }),
    // 背单词也算当天学过（只有词汇的日子不该断签）
    prisma.vocabProgress.findMany({ where: { userId, updatedAt: { gte: since } }, select: { updatedAt: true } }),
  ]);

  const moduleOf = new Map(passageModules.map((p) => [p.id, p.module]));
  const totals = {
    reading: { count: 0, bestBand: 0 },
    listening: { count: 0, bestBand: 0 },
  };
  for (const g of attemptGroups) {
    const key = moduleOf.get(g.passageId);
    if (key !== "reading" && key !== "listening") continue;
    totals[key].count += g._count._all;
    totals[key].bestBand = Math.max(totals[key].bestBand, g._max.band ?? 0);
  }

  // 趋势图要时间正序；上面按 desc 取的是"最近 N 条"，这里翻回来
  const trendAttempts = [...recentAttempts].reverse();
  const readingHistory = trendAttempts.filter((a) => moduleOf.get(a.passageId) === "reading");
  const listeningHistory = trendAttempts.filter((a) => moduleOf.get(a.passageId) === "listening");
  const writingHistory = [...recentWritings].reverse();
  const speakingHistory = [...recentSpeakings].reverse();

  const activityDates = new Set<string>();
  for (const d of [
    ...attemptDays.map((a) => a.createdAt),
    ...writingDays.map((s) => s.createdAt),
    ...speakingDays.map((s) => s.createdAt),
    ...vocabDays.map((v) => v.updatedAt),
  ]) {
    activityDates.add(dateKey(d));
  }

  return {
    profile,
    latestAssessment,
    plan,
    vocab: { total: vocabTotal, dueToday: vocabDueToday },
    reading: { ...totals.reading, history: readingHistory },
    listening: { ...totals.listening, history: listeningHistory },
    writing: {
      count: writingCount,
      avgOverall: avgOverall(writingHistory),
      history: writingHistory,
    },
    speaking: {
      count: speakingCount,
      avgOverall: avgOverall(speakingHistory),
      history: speakingHistory,
    },
    streak: computeStreak(activityDates),
    activityDates: Array.from(activityDates),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

/** scores 是 JSON 字符串 {overall,...}；取最近这批的均分。 */
function avgOverall(rows: { scores: string }[]): number {
  if (rows.length === 0) return 0;
  let sum = 0;
  let n = 0;
  for (const r of rows) {
    try {
      const overall = (JSON.parse(r.scores) as { overall?: number }).overall;
      if (typeof overall === "number") {
        sum += overall;
        n++;
      }
    } catch {
      // 坏数据不算进均分
    }
  }
  return n > 0 ? sum / n : 0;
}

/** 本地日期键（用 UTC 会把东八区凌晨的学习算到前一天，导致 streak 无故断） */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeStreak(dates: Set<string>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < STREAK_WINDOW_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    if (dates.has(key)) streak++;
    else if (i === 0) continue; // 允许今天还没学
    else break;
  }
  return streak;
}