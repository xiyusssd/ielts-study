import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic } from "lucide-react";

type Scores = { fluency: number; vocabulary: number; grammar: number; pronunciation: number; overall: number };
type Feedback = { feedback: string; strengths: string[]; improvements: string[] };

const CRITERIA: Record<keyof Omit<Scores, "overall">, string> = {
  fluency: "Fluency & Coherence",
  vocabulary: "Lexical Resource",
  grammar: "Grammatical Range",
  pronunciation: "Pronunciation",
};

export default async function SpeakingSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  if (!user) return null;
  const { sessionId } = await params;

  const s = await prisma.speakingSession.findUnique({ where: { id: sessionId } });
  if (!s || s.userId !== user.id) notFound();

  const scores = JSON.parse(s.scores) as Scores;
  const fb = JSON.parse(s.feedback) as Feedback;
  const transcript = JSON.parse(s.transcript) as { role: string; text: string; ts: number }[];
  const usedAI = !!s.provider;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/speaking">
          <ArrowLeft className="h-4 w-4" /> 返回口语
        </Link>
      </Button>

      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <Card className="bg-primary/5">
          <CardHeader>
            <CardTitle>Part {s.part} · Overall</CardTitle>
            <CardDescription>4 维平均</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-6xl font-bold text-primary">{scores.overall}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              {s.createdAt.toLocaleString("zh-CN")}
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
            {(["fluency", "vocabulary", "grammar", "pronunciation"] as const).map((k) => (
              <div key={k}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{CRITERIA[k]}</span>
                  <span className="font-mono font-semibold">{scores[k]}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${(scores[k] / 9) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>总评</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{fb.feedback}</p>
        </CardContent>
      </Card>

      {(fb.strengths?.length || fb.improvements?.length) && (
        <div className="grid gap-4 md:grid-cols-2">
          {fb.strengths?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-green-700">优点</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="ml-4 list-disc space-y-1 text-sm">
                  {fb.strengths.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}
          {fb.improvements?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-orange-700">改进方向</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="ml-4 list-disc space-y-1 text-sm">
                  {fb.improvements.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>会话记录</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transcript.map((t, i) => (
            <div key={i} className="flex gap-3">
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-mono ${
                t.role === "examiner" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30" : "bg-green-100 text-green-700 dark:bg-green-900/30"
              }`}>
                {t.role === "examiner" ? "考官" : "你"}
              </span>
              <div className="flex-1 whitespace-pre-wrap text-sm">{t.text}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href={`/speaking/part${s.part}`}>
            <Mic className="h-4 w-4" /> 再练一次 Part {s.part}
          </Link>
        </Button>
      </div>
    </div>
  );
}
