import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { bandFeedback } from "@/lib/scoring/band-mapper";
import type { AssessmentResults } from "@/lib/assessment/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen } from "lucide-react";

/** 正确率 → 颜色分级：高绿 / 中黄 / 低红 */
function accentFor(pct: number): { bar: string; text: string } {
  if (pct >= 70) return { bar: "bg-success", text: "text-success" };
  if (pct >= 40) return { bar: "bg-[hsl(var(--warning))]", text: "text-[hsl(var(--warning))]" };
  return { bar: "bg-destructive", text: "text-destructive" };
}

export const dynamic = "force-dynamic";

const LEVEL_LABEL: Record<number, string> = {
  3000: "基础 (3000)",
  5000: "进阶 (5000)",
  7000: "高级 (7000)",
  8500: "学术 (8500)",
};

export default async function VocabResultPage() {
  const user = await requireUser();
  if (!user) return null;
  const latest = await prisma.assessment.findFirst({
    where: { userId: user.id, type: "initial" },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) redirect("/assessment");
  const results = JSON.parse(latest.results) as AssessmentResults;
  const vocab = results.sections.vocab;
  if (!vocab) redirect("/assessment/vocab");

  const band = vocab.score ?? 0;
  const raw = (vocab.raw ?? {}) as {
    byLevel?: Record<string, { correct: number; total: number }>;
    size?: number;
    sizeLow?: number;
    sizeHigh?: number;
  };
  const byLevel = raw.byLevel ?? {};
  const size = raw.size ?? 0;
  const low = raw.sizeLow ?? size;
  const high = raw.sizeHigh ?? size;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">词汇测试结果</h1>
        <p className="text-sm text-muted-foreground">基于频率带抽样的估算，仅供参考</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" /> 估算词汇量
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">约 {size.toLocaleString()} 词</div>
            <p className="mt-1 text-xs text-muted-foreground">
              区间 {low.toLocaleString()}–{high.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>词汇水平 (IELTS)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">Band {band || "—"}</span>
              {band > 0 && (
                <Badge variant={band >= 7 ? "success" : band >= 5.5 ? "default" : "warning"}>
                  {band >= 7 ? "优秀" : band >= 5.5 ? "良好" : "待提升"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">各频率带正确率</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[3000, 5000, 7000, 8500].map((lv) => {
            const g = byLevel[String(lv)];
            const total = g?.total ?? 0;
            const correct = g?.correct ?? 0;
            const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
            const ac = accentFor(pct);
            return (
              <div key={lv} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-muted-foreground">{LEVEL_LABEL[lv]}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full transition-all ${ac.bar}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`w-20 shrink-0 text-right text-sm font-medium tabular-nums ${total > 0 ? ac.text : "text-muted-foreground"}`}>
                  {correct}/{total} · {pct}%
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">建议</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{bandFeedback("vocab", band)}</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild>
          <Link href="/assessment/listening">
            继续 · 听力测试 <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
