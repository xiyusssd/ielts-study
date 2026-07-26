import Link from "next/link";
import { getOrStartAssessment, nextSection, startFreshAssessment } from "@/lib/assessment/actions";
import { SECTIONS, SECTION_META } from "@/lib/assessment/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { CheckCircle2, Circle, Sparkles, PlayCircle, RotateCcw, FileBarChart, PencilLine } from "lucide-react";

export default async function AssessmentPage() {
  const { requireUser } = await import("@/lib/auth/session");
  if (!(await requireUser())) return null;
  const { results } = await getOrStartAssessment();
  const next = await nextSection();

  const totalMinutes = SECTIONS.reduce((sum, s) => sum + SECTION_META[s].minutes, 0);
  const doneCount = SECTIONS.filter((s) => results.sections[s]?.submittedAt).length;
  const hasAnyResult = doneCount > 0;

  return (
    <div className="space-y-6 animate-in-slide">
      <PageHeader
        icon={Sparkles}
        title="5 维水平诊断"
        description={`5 项标准化测试估算你的当前雅思水平，全程约 ${totalMinutes} 分钟 · 可分段完成`}
        gradient
      />

      {hasAnyResult && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-brand-soft p-4 text-sm">
          <span>
            {doneCount === 5
              ? "5 段已全部完成 · 可查看报告，或单独重测任意模块"
              : `进度：${doneCount} / 5 段已完成 · 继续做下一段，或单独重测已完成的模块`}
          </span>
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/assessment/report">
                <FileBarChart className="h-4 w-4" />
                查看报告
              </Link>
            </Button>
            <form action={startFreshAssessment}>
              <Button type="submit" variant="outline" size="sm">
                <RotateCcw className="h-4 w-4" />
                重新测全部
              </Button>
            </form>
          </div>
        </div>
      )}

      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-3">
            <PencilLine className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">已经知道自己的分数？</CardTitle>
              <CardDescription>直接填写 5 维雅思分数，跳过测试，立即生成报告与规划</CardDescription>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/assessment/manual">
              <PencilLine className="h-4 w-4" />
              填写分数
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {SECTIONS.map((s) => {
          const meta = SECTION_META[s];
          const done = !!results.sections[s]?.submittedAt;
          const score = results.sections[s]?.score;
          const isNext = s === next;
          return (
            <Card key={s} className={done ? "opacity-70" : isNext ? "border-primary" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <CardTitle className="text-base">{meta.label}</CardTitle>
                    <CardDescription>{meta.description} · {meta.minutes} 分钟</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {done && score !== undefined && (
                    <span className="rounded bg-green-100 px-2 py-1 text-sm font-semibold text-green-700 dark:bg-green-900/30">
                      {score}
                    </span>
                  )}
                  {done ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/assessment/${s}`}>
                        <RotateCcw className="h-4 w-4" />
                        重测
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant={isNext ? "default" : "outline"}>
                      <Link href={`/assessment/${s}`}>
                        <PlayCircle className="h-4 w-4" />
                        开始
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {doneCount === 5 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-6">
            <Button asChild size="lg">
              <Link href="/assessment/report">查看报告</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
