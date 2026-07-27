import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { QuestionRenderer } from "@/components/reading/question-renderer";
import { AddWordsButton } from "@/components/reading/add-words-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp } from "lucide-react";

export default async function ReadingResultPage({
  params,
}: {
  params: Promise<{ passageId: string; attemptId: string }>;
}) {
  const user = await requireUser();
  if (!user) return null;
  const { passageId, attemptId } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      // no direct relation for passage; fetch separately
    },
  });
  if (!attempt || attempt.userId !== user.id || attempt.passageId !== passageId) notFound();

  const passage = await prisma.passage.findUnique({
    where: { id: passageId },
    include: { questions: { orderBy: { index: "asc" } } },
  });
  if (!passage) notFound();

  const gradedAnswers = JSON.parse(attempt.answers) as Record<
    string,
    { user: string; correct: string; ok: boolean }
  >;

  const correct = Object.values(gradedAnswers).filter((g) => g.ok).length;
  const total = passage.questions.length;
  const wrongQs = passage.questions.filter((q) => gradedAnswers[q.id] && !gradedAnswers[q.id].ok);

  // 从错题里提取候选生词（长度>3、字母词）
  const candidateWords = extractWords(passage.content);

  const minutes = Math.floor(attempt.duration / 60);
  const seconds = attempt.duration % 60;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/reading">
          <ArrowLeft className="h-4 w-4" /> 返回阅读
        </Link>
      </Button>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{passage.title}</CardTitle>
            <CardDescription>提交于 {attempt.createdAt.toLocaleString("zh-CN")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="正确" value={`${correct} / ${total}`} accent="green" />
              <Stat label="估算 Band" value={String(attempt.band ?? "—")} accent="primary" />
              <Stat label="用时" value={`${minutes}′${String(seconds).padStart(2, "0")}″`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              生词提取
            </CardTitle>
            <CardDescription>把文章生词加入词汇队列</CardDescription>
          </CardHeader>
          <CardContent>
            <AddWordsButton candidates={candidateWords} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>逐题回顾</CardTitle>
          <CardDescription>红色高亮 = 答错。点击错题下方"解析"看考点。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {passage.questions.map((q) => {
            const g = gradedAnswers[q.id];
            const stdRaw = JSON.parse(q.answer) as string | string[];
            const stdStr = Array.isArray(stdRaw) ? stdRaw.join(" / ") : stdRaw;
            return (
              <QuestionRenderer
                key={q.id}
                q={{
                  id: q.id,
                  index: q.index,
                  type: q.type as "tfng" | "mcq" | "matching" | "gapfill" | "heading",
                  prompt: q.prompt,
                  options: q.options ? JSON.parse(q.options) : null,
                }}
                value={g?.user ?? ""}
                reviewMode
                correctAnswer={stdStr}
                ok={g?.ok}
                explanation={q.explanation ?? undefined}
              />
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "green" | "primary" }) {
  const cls =
    accent === "green"
      ? "text-green-600"
      : accent === "primary"
        ? "text-primary"
        : "text-foreground";
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${cls}`}>{value}</div>
    </div>
  );
}

/** 从文章里挑候选生词（简易版：长度 >= 6 的独特字母词，取前 12 个） */
function extractWords(content: string): string[] {
  const words = content
    .toLowerCase()
    .match(/\b[a-z]{6,}\b/g);
  if (!words) return [];
  const unique = Array.from(new Set(words));
  return unique.slice(0, 12);
}
