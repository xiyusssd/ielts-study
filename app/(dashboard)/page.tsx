import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/dashboard/data";
import type { Bands } from "@/lib/scoring/band-mapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BandRadar } from "@/components/charts/band-radar";
import { WeekTasks } from "@/components/planner/week-tasks";
import { TrendLine, type TrendPoint } from "@/components/charts/trend-line";
import { Sparkles, Target, BookOpen, Headphones, Pen, Mic, Languages, ArrowRight, Flame, Calendar } from "lucide-react";

const moduleGradients: Record<string, string> = {
  vocab: "from-blue-500 to-cyan-500",
  reading: "from-emerald-500 to-teal-500",
  listening: "from-amber-500 to-orange-500",
  writing: "from-rose-500 to-pink-500",
  speaking: "from-violet-500 to-purple-500",
};

export default async function DashboardHomePage() {
  const user = await requireUser();
  if (!user) return null;

  const data = await getDashboardData(user.id);
  const { profile, latestAssessment, plan, vocab, reading, listening, writing, speaking, streak } = data;

  const needsAssessment = !latestAssessment?.results || !JSON.parse(latestAssessment.results).completedAt;
  const needsPlan = !plan && latestAssessment && !needsAssessment;
  const bands = latestAssessment ? (JSON.parse(latestAssessment.bands) as Bands & { overall: number }) : null;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const todayTasks = plan?.weeks.flatMap((w) => w.tasks).filter((t) => {
    const d = new Date(t.date);
    return d >= today && d < tomorrow;
  }) ?? [];
  const todayDoneCount = todayTasks.filter((t) => t.completed).length;

  const daysToExam = profile?.examDate
    ? Math.ceil((profile.examDate.getTime() - Date.now()) / (24 * 3600 * 1000))
    : null;

  const trend: TrendPoint[] = buildTrendData(reading.history, listening.history, writing.history, speaking.history);

  return (
    <div className="space-y-8 animate-in-slide">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white shadow-glow lg:p-8">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-10" />
        <div className="bg-hero-glow pointer-events-none absolute inset-0" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-white/80">
              <Sparkles className="h-4 w-4" />
              {greeting()}
            </div>
            <h1 className="font-display text-3xl font-bold lg:text-4xl">
              {user.email.split("@")[0]}
              {streak > 0 && (
                <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-base font-medium align-middle backdrop-blur">
                  <Flame className="h-4 w-4" />
                  连续 {streak} 天
                </span>
              )}
            </h1>
            <p className="mt-2 text-white/80">
              {daysToExam !== null
                ? `距离考试还有 ${daysToExam} 天，坚持就是胜利`
                : "先做一次水平测试，让 AI 为你规划路径"}
            </p>
          </div>
          {daysToExam !== null && (
            <div className="rounded-xl bg-white/10 px-5 py-3 text-right backdrop-blur">
              <div className="flex items-center gap-1 text-xs text-white/70">
                <Calendar className="h-3 w-3" />
                距考试
              </div>
              <div className="font-display nums text-4xl font-bold">{daysToExam}</div>
              <div className="text-xs text-white/70">天</div>
            </div>
          )}
        </div>
      </div>

      {/* CTA cards */}
      {needsAssessment && (
        <Card className="border-primary/40 bg-brand-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" /> 第一步：水平诊断
            </CardTitle>
            <CardDescription>5 维测试（词汇 / 听 / 读 / 写 / 说），约 20-30 分钟</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="gradient" size="lg">
              <Link href="/assessment">开始测试 <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {needsPlan && (
        <Card className="border-primary/40 bg-brand-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" /> 定制学习计划
            </CardTitle>
            <CardDescription>输入目标分数和考试时间，AI 生成周计划</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="gradient" size="lg">
              <Link href="/plan/setup">生成计划 <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {bands && !needsAssessment && (
        <>
          {/* 主要内容三栏 */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="card-hoverable">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">今日任务</CardTitle>
                <CardDescription>
                  {todayTasks.length
                    ? `${todayDoneCount} / ${todayTasks.length} 完成`
                    : "今日无安排"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayTasks.length ? (
                  <WeekTasks tasks={todayTasks.map((t) => ({
                    id: t.id,
                    module: t.module,
                    date: t.date.toISOString(),
                    completed: t.completed,
                    content: JSON.parse(t.content),
                  }))} />
                ) : (
                  <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
                    {plan ? "今天没有安排，可以练口语或背几个单词" : "生成学习计划后这里会显示每日任务"}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-hoverable">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">5 维雷达</CardTitle>
                <CardDescription>当前 vs 目标</CardDescription>
              </CardHeader>
              <CardContent>
                <BandRadar
                  bands={bands}
                  targets={profile ? {
                    vocab: profile.targetOverall ?? undefined,
                    listening: profile.targetListening ?? undefined,
                    reading: profile.targetReading ?? undefined,
                    writing: profile.targetWriting ?? undefined,
                    speaking: profile.targetSpeaking ?? undefined,
                  } as Partial<Bands> : undefined}
                />
                <div className="mt-2 flex items-center justify-center gap-2 text-sm">
                  <span className="text-muted-foreground">Overall</span>
                  <span className="font-display nums text-2xl font-bold text-brand-gradient">{bands.overall || "—"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hoverable">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">成绩趋势</CardTitle>
                <CardDescription>做题分数演变</CardDescription>
              </CardHeader>
              <CardContent><TrendLine data={trend} /></CardContent>
            </Card>
          </div>

          {/* 模块快速入口 */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">五大模块</h2>
              <span className="text-xs text-muted-foreground">点击卡片进入</span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <ModuleCard index={0} label="词汇" href="/vocab" icon={Languages} value={vocab.total} sub={`${vocab.dueToday} 待复习`} module="vocab" />
              <ModuleCard index={1} label="阅读" href="/reading" icon={BookOpen} value={reading.count} sub={reading.bestBand ? `Best ${reading.bestBand}` : "未尝试"} module="reading" />
              <ModuleCard index={2} label="听力" href="/listening" icon={Headphones} value={listening.count} sub={listening.bestBand ? `Best ${listening.bestBand}` : "未尝试"} module="listening" />
              <ModuleCard index={3} label="写作" href="/writing" icon={Pen} value={writing.count} sub={writing.avgOverall > 0 ? `均 ${writing.avgOverall.toFixed(1)}` : "未尝试"} module="writing" />
              <ModuleCard index={4} label="口语" href="/speaking" icon={Mic} value={speaking.count} sub={speaking.avgOverall > 0 ? `均 ${speaking.avgOverall.toFixed(1)}` : "未尝试"} module="speaking" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ModuleCard({
  label, href, icon: Icon, value, sub, module, index = 0,
}: {
  label: string; href: string; icon: typeof Languages; value: number; sub: string; module: string; index?: number;
}) {
  const grad = moduleGradients[module];
  return (
    <Link href={href} className="group block">
      <div
        className="stagger-item relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-glow"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${grad} opacity-0 transition-opacity group-hover:opacity-[0.07]`} />
        <div className="relative">
          <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${grad} text-white shadow-soft transition-transform group-hover:scale-105`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="font-display nums text-2xl font-bold">{value}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
        </div>
      </div>
    </Link>
  );
}

function buildTrendData(
  reading: { createdAt: Date; band: number | null }[],
  listening: { createdAt: Date; band: number | null }[],
  writing: { createdAt: Date; scores: string }[],
  speaking: { createdAt: Date; scores: string }[],
): TrendPoint[] {
  const dayMap = new Map<string, TrendPoint>();
  function ensure(d: Date): TrendPoint {
    const key = d.toISOString().slice(0, 10);
    if (!dayMap.has(key)) dayMap.set(key, { date: key.slice(5) });
    return dayMap.get(key)!;
  }
  for (const a of reading) if (a.band) ensure(a.createdAt)["阅读"] = a.band;
  for (const a of listening) if (a.band) ensure(a.createdAt)["听力"] = a.band;
  for (const s of writing) {
    const sc = JSON.parse(s.scores);
    if (sc.overall) ensure(s.createdAt)["写作"] = sc.overall;
  }
  for (const s of speaking) {
    const sc = JSON.parse(s.scores);
    if (sc.overall) ensure(s.createdAt)["口语"] = sc.overall;
  }
  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "夜深了，注意休息";
  if (h < 12) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  if (h < 22) return "晚上好";
  return "夜深了，注意休息";
}
