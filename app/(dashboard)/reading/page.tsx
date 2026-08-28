import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen, ArrowRight, Trophy, FileText } from "lucide-react";

export default async function ReadingPage() {
  const user = await requireUser();
  if (!user) return null;

  const [passages, attemptStats, recentAttempts] = await Promise.all([
    // 列表只用到标题/题数/元信息，别把 Passage.content(每篇约 5KB，80 篇共 400KB) 拉进内存
    prisma.passage.findMany({
      where: { module: "reading", active: true },
      select: {
        id: true,
        title: true,
        metadata: true,
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    // 计数/最高分走聚合：早先用「最近 20 条」既当历史又当 Best，做题多了就明显偏低
    prisma.attempt.groupBy({
      by: ["passageId"],
      where: { userId: user.id },
      _count: { _all: true },
      _max: { band: true },
    }),
    // 每篇卡片下方只展示最近几次记录，取一小段明细够用
    prisma.attempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, passageId: true, band: true, createdAt: true },
    }),
  ]);

  const passageIds = new Set(passages.map((p) => p.id));
  const statByPassage = new Map(
    attemptStats.filter((s) => passageIds.has(s.passageId)).map((s) => [s.passageId, s]),
  );
  const attemptTotal = [...statByPassage.values()].reduce((n, s) => n + s._count._all, 0);
  const bestBand = [...statByPassage.values()].reduce((m, s) => Math.max(m, s._max.band ?? 0), 0);
  const recentByPassage = new Map<string, typeof recentAttempts>();
  for (const a of recentAttempts) {
    if (!passageIds.has(a.passageId)) continue;
    if (!recentByPassage.has(a.passageId)) recentByPassage.set(a.passageId, []);
    recentByPassage.get(a.passageId)!.push(a);
  }

  return (
    <div className="space-y-6 animate-in-slide">
      <PageHeader
        icon={BookOpen}
        title="阅读"
        description="剑桥真题 + AI 生成 · 60 分钟计时做题"
        gradient
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="题目数" value={String(passages.length)} icon={FileText} color="text-blue-500" />
        <StatCard label="历史做题" value={String(attemptTotal)} icon={ArrowRight} color="text-purple-500" />
        <StatCard label="最高 Band" value={bestBand > 0 ? String(bestBand) : "—"} icon={Trophy} color="text-amber-500" highlight />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">题库</h2>
        {passages.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="题库为空"
            description="运行 seed 脚本导入内置样本，或用 AI 生成题目"
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {passages.map((p) => {
              const meta = JSON.parse(p.metadata) as { difficulty: number; wordCount: number; topics: string[] };
              const stat = statByPassage.get(p.id);
              const doneCount = stat?._count._all ?? 0;
              const bestOnThis = stat?._max.band ?? 0;
              const recent = recentByPassage.get(p.id) ?? [];
              return (
                <Card key={p.id} className="card-hoverable">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="line-clamp-2 text-base">{p.title}</CardTitle>
                      {bestOnThis > 0 && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-mono font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Best {bestOnThis}
                        </span>
                      )}
                    </div>
                    <CardDescription className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
                      <span>{p._count.questions} 题</span>
                      <span>·</span>
                      <span>{meta.wordCount} 词</span>
                      <span>·</span>
                      <span>Band {meta.difficulty}</span>
                      <span>·</span>
                      <span>{meta.topics.join(" / ")}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button asChild size="sm" className="w-full">
                      <Link href={`/reading/${p.id}`}>
                        {doneCount > 0 ? "再做一次" : "开始阅读"}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                    {recent.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 text-xs">
                        {recent.slice(0, 3).map((a) => (
                          <Link
                            key={a.id}
                            href={`/reading/${p.id}/result/${a.id}`}
                            className="rounded border px-2 py-0.5 hover:bg-muted transition-colors"
                          >
                            {a.createdAt.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })} · {a.band}
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, highlight }: {
  label: string; value: string; icon: typeof BookOpen; color: string; highlight?: boolean;
}) {
  return (
    <Card className="card-hoverable">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className={`h-4 w-4 ${color}`} />
          {label}
        </div>
        <div className={`mt-1 text-3xl font-bold ${highlight ? "text-brand-gradient" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
