import { prisma } from "@/lib/db";

/** 拉取 dashboard 需要的聚合数据 */
export async function getDashboardData(userId: string) {
  const [
    profile,
    latestAssessment,
    plan,
    vocabTotal,
    vocabDueToday,
    readingAttempts,
    listeningAttempts,
    writingSubs,
    speakingSessions,
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
    prisma.vocabProgress.count({
      where: {
        userId,
        dueAt: { lte: new Date(new Date().setHours(23, 59, 59, 999)) },
      },
    }),
    prisma.attempt.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    // 注：listening 和 reading 都存在 Attempt 表，通过 passage.module 区分
    // 这里我们后面用 passage 类型分组
    Promise.resolve(null),
    prisma.writingSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.speakingSession.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
  ]);

  // 分开 reading / listening
  const passageIds = readingAttempts.map((a) => a.passageId);
  const passageInfo = passageIds.length
    ? await prisma.passage.findMany({
        where: { id: { in: passageIds } },
        select: { id: true, module: true },
      })
    : [];
  const passageModule = new Map(passageInfo.map((p) => [p.id, p.module]));
  const readingList = readingAttempts.filter((a) => passageModule.get(a.passageId) === "reading");
  const listeningList = readingAttempts.filter((a) => passageModule.get(a.passageId) === "listening");

  // streak：过去 30 天有活动的连续天数
  const activityDates = new Set<string>();
  const events = [
    ...readingAttempts.map((a) => a.createdAt),
    ...writingSubs.map((s) => s.createdAt),
    ...speakingSessions.map((s) => s.createdAt),
  ];
  for (const d of events) {
    activityDates.add(dateKey(d));
  }
  const streak = computeStreak(activityDates);

  return {
    profile,
    latestAssessment,
    plan,
    vocab: { total: vocabTotal, dueToday: vocabDueToday },
    reading: {
      count: readingList.length,
      bestBand: readingList.reduce((m, a) => Math.max(m, a.band ?? 0), 0),
      history: readingList,
    },
    listening: {
      count: listeningList.length,
      bestBand: listeningList.reduce((m, a) => Math.max(m, a.band ?? 0), 0),
      history: listeningList,
    },
    writing: {
      count: writingSubs.length,
      avgOverall:
        writingSubs.length
          ? writingSubs.reduce(
              (sum, s) => sum + (JSON.parse(s.scores).overall ?? 0),
              0,
            ) / writingSubs.length
          : 0,
      history: writingSubs,
    },
    speaking: {
      count: speakingSessions.length,
      avgOverall:
        speakingSessions.length
          ? speakingSessions.reduce(
              (sum, s) => sum + (JSON.parse(s.scores).overall ?? 0),
              0,
            ) / speakingSessions.length
          : 0,
      history: speakingSessions,
    },
    streak,
    activityDates: Array.from(activityDates),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function computeStreak(dates: Set<string>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    if (dates.has(key)) streak++;
    else if (i === 0) continue; // 允许今天还没学
    else break;
  }
  return streak;
}
