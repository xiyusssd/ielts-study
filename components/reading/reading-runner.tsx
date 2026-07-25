"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { QuestionRenderer, type RenderedQ } from "@/components/reading/question-renderer";
import { submitReadingAttempt } from "@/lib/reading/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Countdown } from "@/components/assessment/countdown";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Flag } from "lucide-react";

export function ReadingRunner({
  passageId,
  title,
  content,
  questions,
  minutes = 60,
}: {
  passageId: string;
  title: string;
  content: string;
  questions: RenderedQ[];
  minutes?: number;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const startedAt = useState(Date.now())[0];

  function toggleFlag(id: string) {
    const next = new Set(flagged);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFlagged(next);
  }

  function submit() {
    start(async () => {
      try {
        const duration = Math.round((Date.now() - startedAt) / 1000);
        await submitReadingAttempt({ passageId, answers, duration });
      } catch (err) {
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast.error("提交失败：" + (err as Error).message);
      }
    });
  }

  const answeredCount = Object.values(answers).filter(Boolean).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_180px]">
      {/* passage */}
      <Card className="max-h-[calc(100vh-140px)] overflow-y-auto lg:col-span-1">
        <CardContent className="p-6">
          <h2 className="mb-3 text-xl font-semibold">{title}</h2>
          <div className="whitespace-pre-wrap text-sm leading-7">{content}</div>
        </CardContent>
      </Card>

      {/* questions */}
      <Card className="max-h-[calc(100vh-140px)] overflow-y-auto">
        <CardContent className="space-y-4 p-6">
          <div className="mb-2 flex items-center justify-between border-b pb-2">
            <div className="text-sm font-medium">题目 · 已答 {answeredCount} / {questions.length}</div>
            <Countdown minutes={minutes} onExpire={submit} />
          </div>
          {questions.map((q) => (
            <div key={q.id} id={`q-${q.id}`}>
              <div className="mb-1 flex items-center gap-2">
                <button
                  onClick={() => toggleFlag(q.id)}
                  className={cn(
                    "rounded p-1",
                    flagged.has(q.id) ? "text-orange-500" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs text-muted-foreground">Q{q.index}</span>
              </div>
              <QuestionRenderer
                q={q}
                value={answers[q.id] ?? ""}
                onChange={(v) => setAnswers({ ...answers, [q.id]: v })}
              />
            </div>
          ))}
          <Button onClick={submit} disabled={pending} size="lg" className="w-full">
            {pending ? "判分中..." : "提交答卷"}
          </Button>
        </CardContent>
      </Card>

      {/* palette */}
      <Card className="hidden lg:block">
        <CardContent className="p-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground">题号面板</div>
          <div className="grid grid-cols-4 gap-1.5">
            {questions.map((q) => {
              const answered = !!answers[q.id];
              const isFlagged = flagged.has(q.id);
              return (
                <a
                  key={q.id}
                  href={`#q-${q.id}`}
                  className={cn(
                    "relative flex h-8 items-center justify-center rounded-md border text-xs font-mono",
                    answered ? "border-primary bg-primary/10" : "text-muted-foreground",
                  )}
                >
                  {q.index}
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-orange-500" />
                  )}
                </a>
              );
            })}
          </div>
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-primary" /> 已答
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3" /> 未答
            </div>
            <div className="flex items-center gap-2">
              <Flag className="h-3 w-3 text-orange-500" /> 标记
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
