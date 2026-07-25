import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WeekTasks } from "@/components/planner/week-tasks";
import { Target, Calendar, Clock, Pencil } from "lucide-react";

const MODULE_LABEL: Record<string, string> = {
  vocab: "词汇",
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
};

export default async function PlanPage() {
  const user = await requireUser();
  if (!user) return null;
  const [profile, plan] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.plan.findUnique({
      where: { userId: user.id },
      include: {
        weeks: {
          orderBy: { weekIndex: "asc" },
          include: { tasks: { orderBy: { date: "asc" } } },
        },
      },
    }),
  ]);

  if (!plan) redirect("/plan/setup");

  const totalTasks = plan.weeks.reduce((s, w) => s + w.tasks.length, 0);
  const doneTasks = plan.weeks.reduce((s, w) => s + w.tasks.filter((t) => t.completed).length, 0);
  const now = new Date();
  const currentWeek = plan.weeks.find((w) => {
    const start = w.tasks[0]?.date ?? plan.startDate;
    const nextWeek = plan.weeks[w.weekIndex + 1];
    const end = nextWeek?.tasks[0]?.date ?? plan.endDate;
    return now >= new Date(start) && now < new Date(end);
  }) ?? plan.weeks[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">学习计划</h1>
          <p className="text-muted-foreground">
            共 {plan.weeks.length} 周 · {totalTasks} 个任务
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/plan/setup">
            <Pencil className="h-4 w-4" />
            修改目标
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              目标总分
            </div>
            <div className="mt-1 text-3xl font-bold">{profile?.targetOverall}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              考试日期
            </div>
            <div className="mt-1 text-lg font-semibold">
              {profile?.examDate?.toLocaleDateString("zh-CN")}
            </div>
            <div className="text-xs text-muted-foreground">
              还有 {Math.ceil(((profile?.examDate?.getTime() ?? 0) - now.getTime()) / (24 * 3600 * 1000))} 天
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              整体进度
            </div>
            <div className="mt-2">
              <Progress value={totalTasks ? (doneTasks / totalTasks) * 100 : 0} />
              <div className="mt-1 text-xs text-muted-foreground">
                完成 {doneTasks} / {totalTasks} 个任务
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>第 {currentWeek.weekIndex + 1} 周（本周）</CardTitle>
          <CardDescription>
            {(Object.entries(JSON.parse(currentWeek.focus)) as [string, number][])
              .filter(([, h]) => h >= 0.5)
              .map(([m, h]) => `${MODULE_LABEL[m] || m} ${h.toFixed(1)}h`)
              .join(" · ")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WeekTasks tasks={currentWeek.tasks.map((t) => ({
            id: t.id,
            module: t.module,
            content: JSON.parse(t.content),
            date: t.date.toISOString(),
            completed: t.completed,
          }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>所有周概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {plan.weeks.map((w) => {
              const focus = JSON.parse(w.focus) as Record<string, number>;
              const done = w.tasks.filter((t) => t.completed).length;
              return (
                <div
                  key={w.id}
                  className={
                    "rounded-lg border p-3 text-sm " +
                    (w.id === currentWeek.id ? "border-primary bg-primary/5" : "")
                  }
                >
                  <div className="font-medium">
                    第 {w.weekIndex + 1} 周
                    {w.id === currentWeek.id && (
                      <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                        本周
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {Object.entries(focus)
                      .filter(([, h]) => h >= 0.5)
                      .slice(0, 3)
                      .map(([m, h]) => `${MODULE_LABEL[m]} ${h.toFixed(1)}h`)
                      .join(" · ")}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {done} / {w.tasks.length} 完成
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
