import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrStartAssessment, nextSection } from "@/lib/assessment/actions";
import { SECTIONS, SECTION_META } from "@/lib/assessment/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { CheckCircle2, Circle, Sparkles, PlayCircle } from "lucide-react";

export default async function AssessmentPage() {
  const { requireUser } = await import("@/lib/auth/session");
  if (!(await requireUser())) return null;
  const { results } = await getOrStartAssessment();
  const next = await nextSection();
  if (next === "report" && results.completedAt) redirect("/assessment/report");

  const totalMinutes = SECTIONS.reduce((sum, s) => sum + SECTION_META[s].minutes, 0);
  const doneCount = SECTIONS.filter((s) => results.sections[s]?.submittedAt).length;

  return (
    <div className="space-y-6 animate-in-slide">
      <PageHeader
        icon={Sparkles}
        title="5 维水平诊断"
        description={`5 项标准化测试估算你的当前雅思水平，全程约 ${totalMinutes} 分钟 · 可分段完成`}
        gradient
      />

      {doneCount > 0 && doneCount < 5 && (
        <div className="rounded-lg border bg-brand-soft p-4 text-sm">
          进度：{doneCount} / 5 段已完成 · 继续做下一段
        </div>
      )}

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
                  {isNext && !done && (
                    <Button asChild size="sm">
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
