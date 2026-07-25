import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { generateDailyQueue } from "@/lib/srs/queue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ArrowRight, BookMarked, Flame, TrendingUp, Languages } from "lucide-react";

export default async function VocabPage() {
  const user = await requireUser();
  if (!user) return null;

  const [queue, totalLearned, byLevel, recent] = await Promise.all([
    generateDailyQueue(user.id, { newLimit: 20, reviewLimit: 100 }),
    prisma.vocabProgress.count({ where: { userId: user.id } }),
    prisma.$queryRawUnsafe<{ level: number; c: bigint }[]>(
      `SELECT w.level, COUNT(*) as c FROM VocabProgress vp
       JOIN Word w ON w.id = vp.wordId
       WHERE vp.userId = ? GROUP BY w.level ORDER BY w.level`,
      user.id,
    ),
    prisma.vocabProgress.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { word: true },
    }),
  ]);

  const totalToStudy = queue.dueList.length + queue.newList.length;
  const dailyGoal = 20;
  const donePct = Math.min(100, Math.round(((dailyGoal - queue.newList.length) / dailyGoal) * 100));

  return (
    <div className="space-y-6 animate-in-slide">
      <PageHeader
        icon={Languages}
        title="词汇"
        description="Shanbay 风格间隔重复 · FSRS 算法"
        gradient
      />

      <Card className="overflow-hidden border-primary/40">
        <div className="bg-brand-gradient p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm text-white/80">
                <Flame className="h-4 w-4" />
                今日队列
              </div>
              <div className="text-3xl font-bold">{totalToStudy} 词</div>
              <div className="mt-1 text-sm text-white/70">
                {queue.dueList.length} 待复习 · {queue.newList.length} 新词
              </div>
            </div>
            {totalToStudy > 0 ? (
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link href="/vocab/study">
                  开始学习
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <div className="rounded-lg bg-white/10 px-4 py-2 text-sm backdrop-blur">今日已清空 🎉</div>
            )}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${donePct}%` }} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              总进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-brand-gradient">{totalLearned}</div>
            <div className="text-sm text-muted-foreground">已学单词数</div>
            <div className="mt-4 space-y-1.5 text-sm">
              {byLevel.map((l) => (
                <div key={l.level} className="flex items-center justify-between">
                  <span className="text-muted-foreground">CEFR Level {l.level}</span>
                  <span className="font-mono font-medium">{Number(l.c)}</span>
                </div>
              ))}
              {byLevel.length === 0 && <div className="text-xs text-muted-foreground">还没学过词</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookMarked className="h-4 w-4 text-primary" />
              最近学习
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">还没有学过的单词</p>
            ) : (
              <div className="space-y-0.5 text-sm">
                {recent.map((r) => (
                  <Link
                    key={r.id}
                    href={`/vocab/${r.wordId}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{r.word.spelling}</span>
                    <span className="text-xs text-muted-foreground">
                      L{r.word.level} · × {r.reps}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
