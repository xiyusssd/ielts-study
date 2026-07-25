import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type Scores = { tr: number; cc: number; lr: number; gra: number; overall: number };
type Feedback = {
  feedback: string;
  paragraphComments: string[];
  corrections: { wrong: string; correct: string; explain: string }[];
};

const CRITERIA_LABEL: Record<keyof Omit<Scores, "overall">, string> = {
  tr: "Task Response",
  cc: "Coherence & Cohesion",
  lr: "Lexical Resource",
  gra: "Grammatical Range & Accuracy",
};

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const user = await requireUser();
  if (!user) return null;
  const { submissionId } = await params;

  const sub = await prisma.writingSubmission.findUnique({
    where: { id: submissionId },
    include: { prompt: true },
  });
  if (!sub || sub.userId !== user.id) notFound();

  const scores = JSON.parse(sub.scores) as Scores;
  const fb = JSON.parse(sub.feedback) as Feedback;
  const paragraphs = sub.content.split(/\n\s*\n/).filter((p) => p.trim());
  const usedAI = !!sub.provider;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/writing">
          <ArrowLeft className="h-4 w-4" /> 返回写作
        </Link>
      </Button>

      {/* 分数卡 */}
      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <Card className="bg-primary/5">
          <CardHeader>
            <CardTitle>估算 Overall</CardTitle>
            <CardDescription>4 维平均</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-6xl font-bold text-primary">{scores.overall}</div>
            <div className="mt-2 text-sm text-muted-foreground">
              提交于 {sub.createdAt.toLocaleString("zh-CN")} · {sub.wordCount} 词 ·{" "}
              {Math.floor(sub.duration / 60)} 分钟
            </div>
            {!usedAI && (
              <div className="mt-2 rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800 dark:bg-yellow-900/40">
                占位分（未配置 AI）
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">4 维分数</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["tr", "cc", "lr", "gra"] as const).map((k) => (
              <div key={k}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{CRITERIA_LABEL[k]}</span>
                  <span className="font-mono font-semibold">{scores[k]}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(scores[k] / 9) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 总评 */}
      <Card>
        <CardHeader>
          <CardTitle>总评</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{fb.feedback}</p>
        </CardContent>
      </Card>

      {/* 逐段评语 */}
      {fb.paragraphComments && fb.paragraphComments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>逐段点评</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paragraphs.map((para, i) => (
              <div key={i} className="border-l-4 border-primary/40 pl-4">
                <div className="mb-1 whitespace-pre-wrap text-sm leading-relaxed">{para}</div>
                {fb.paragraphComments[i] && (
                  <div className="mt-2 rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                    💡 {fb.paragraphComments[i]}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 错误修正 */}
      {fb.corrections && fb.corrections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>错误修正</CardTitle>
            <CardDescription>AI 挑出的关键改进点</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fb.corrections.map((c, i) => (
              <div key={i} className="rounded-md border p-3">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">原文</div>
                    <div className="rounded bg-red-100 px-2 py-1 text-red-900 dark:bg-red-900/30 dark:text-red-100">
                      {c.wrong}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">改为</div>
                    <div className="rounded bg-green-100 px-2 py-1 text-green-900 dark:bg-green-900/30 dark:text-green-100">
                      {c.correct}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{c.explain}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 快速链接 */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`/writing/${sub.promptId}`}>重做本题</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/writing/templates">看模板</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/writing/samples">看范文</Link>
        </Button>
      </div>
    </div>
  );
}
