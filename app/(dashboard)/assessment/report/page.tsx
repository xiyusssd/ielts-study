import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { bandFeedback, type Bands } from "@/lib/scoring/band-mapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BandRadar } from "@/components/charts/band-radar";
import { ArrowRight, Target, RotateCcw } from "lucide-react";

const LABELS: Record<keyof Bands, string> = {
  vocab: "词汇量",
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
};

export default async function ReportPage() {
  const user = await requireUser();
  if (!user) return null;
  const latest = await prisma.assessment.findFirst({
    where: { userId: user.id, type: "initial" },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) redirect("/assessment");
  const bands = JSON.parse(latest.bands) as Bands & { overall: number };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">你的水平报告</h1>
          <p className="text-muted-foreground">
            基于 5 段诊断测试的估算结果（AI 辅助评分，非官方精确分数）
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/assessment">
            <RotateCcw className="h-4 w-4" />
            返回评估 · 重测模块
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>5 维雷达</CardTitle>
            <CardDescription>直观查看当前各维度水平</CardDescription>
          </CardHeader>
          <CardContent>
            <BandRadar bands={bands} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>估算 Overall</CardTitle>
            <CardDescription>4 项均值按官方规则四舍五入</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-6xl font-bold text-primary">{bands.overall || "—"}</div>
              <div className="mt-2 text-sm text-muted-foreground">当前估算 Band</div>
            </div>
            <div className="mt-6 grid grid-cols-5 gap-2 text-center text-sm">
              {(Object.keys(LABELS) as (keyof Bands)[]).map((k) => (
                <div key={k} className="rounded-md bg-muted p-2">
                  <div className="text-xs text-muted-foreground">{LABELS[k]}</div>
                  <div className="text-lg font-semibold">{bands[k] || "—"}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>各维度分析</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(LABELS) as (keyof Bands)[]).map((k) => (
            <div key={k} className="border-l-4 border-primary/30 pl-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-medium">{LABELS[k]}</span>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">
                  {bands[k] || "未测试"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{bandFeedback(k, bands[k])}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            下一步：制定你的备考计划
          </CardTitle>
          <CardDescription>
            输入目标分数、考试日期和每周可投入时间，AI 会为你生成周计划
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg">
            <Link href="/plan/setup">
              开始规划
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
