import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pen, FileText, BookOpen, ArrowRight, TrendingUp } from "lucide-react";

export default async function WritingHomePage() {
  const user = await requireUser();
  if (!user) return null;

  const [task1, task2, mySubmissions] = await Promise.all([
    prisma.writingPrompt.findMany({
      where: { task: "task1", active: true },
      orderBy: { id: "asc" },
    }),
    prisma.writingPrompt.findMany({
      where: { task: "task2", active: true },
      orderBy: { id: "asc" },
    }),
    prisma.writingSubmission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { prompt: true },
    }),
  ]);

  const subsByPrompt = new Map<string, typeof mySubmissions>();
  for (const s of mySubmissions) {
    if (!subsByPrompt.has(s.promptId)) subsByPrompt.set(s.promptId, []);
    subsByPrompt.get(s.promptId)!.push(s);
  }

  const overallAvg =
    mySubmissions.length > 0
      ? (
          mySubmissions.reduce((sum, s) => sum + (JSON.parse(s.scores).overall ?? 0), 0) /
          mySubmissions.length
        ).toFixed(1)
      : null;

  return (
    <div className="space-y-6 animate-in-slide">
      <PageHeader
        icon={Pen}
        title="写作"
        description="Task 1 + Task 2 · AI 4 维批改 · 模板与范文"
        gradient
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/writing/templates">
                <BookOpen className="h-4 w-4" /> 模板
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/writing/samples">
                <FileText className="h-4 w-4" /> 范文
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-hoverable">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">题目数</div>
            <div className="mt-1 text-3xl font-bold">{task1.length + task2.length}</div>
            <div className="text-xs text-muted-foreground">T1: {task1.length} · T2: {task2.length}</div>
          </CardContent>
        </Card>
        <Card className="card-hoverable">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">我的提交</div>
            <div className="mt-1 text-3xl font-bold">{mySubmissions.length}</div>
            <div className="text-xs text-muted-foreground">全部作文</div>
          </CardContent>
        </Card>
        <Card className="card-hoverable">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">平均分</div>
            <div className="mt-1 text-3xl font-bold text-brand-gradient">{overallAvg ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{overallAvg ? "综合评分" : "还没提交"}</div>
          </CardContent>
        </Card>
      </div>

      {mySubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> 最近提交
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mySubmissions.slice(0, 5).map((s) => {
                const scores = JSON.parse(s.scores);
                return (
                  <Link
                    key={s.id}
                    href={`/writing/submissions/${s.id}`}
                    className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {s.prompt.task === "task1" ? "Task 1" : "Task 2"} · {s.prompt.category}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.prompt.prompt.slice(0, 80)}...
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pl-3">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-sm font-semibold text-primary">
                        {scores.overall}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {s.createdAt.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
            {mySubmissions.length > 5 && (
              <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
                <Link href="/writing/submissions">查看全部 {mySubmissions.length} 篇 <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {[
        { list: task2, title: "Task 2 · 议论文", desc: "250+ 词，40 分钟" },
        { list: task1, title: "Task 1 · 图表描述", desc: "150+ 词，20 分钟" },
      ].map((section, idx) => (
        <div key={idx}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <span className="text-xs text-muted-foreground">{section.desc}</span>
          </div>
          {section.list.length === 0 ? (
            <EmptyState icon={Pen} title="题目为空" description="运行 seed 脚本" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {section.list.map((p) => {
                const my = subsByPrompt.get(p.id) ?? [];
                const bestBand = my.reduce(
                  (m, s) => Math.max(m, JSON.parse(s.scores).overall ?? 0),
                  0,
                );
                return (
                  <Card key={p.id} className="card-hoverable">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardDescription className="uppercase tracking-wide">{p.category}</CardDescription>
                        {bestBand > 0 && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-mono font-semibold text-emerald-700 dark:bg-emerald-900/30">
                            Best {bestBand}
                          </span>
                        )}
                      </div>
                      <CardTitle className="line-clamp-3 text-sm font-normal leading-relaxed">
                        {p.prompt.split(/\n/)[0]}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button asChild size="sm" className="w-full">
                        <Link href={`/writing/${p.id}`}>
                          <Pen className="h-3 w-3" />
                          {my.length > 0 ? "再写一次" : "开始写作"}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
