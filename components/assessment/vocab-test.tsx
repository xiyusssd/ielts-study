"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { VocabQ } from "@/lib/assessment/seed-data";
import { submitVocab } from "@/lib/assessment/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Countdown } from "@/components/assessment/countdown";

export function VocabTest({ questions }: { questions: VocabQ[] }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const q = questions[idx];
  const done = Object.keys(answers).length;
  const canSubmit = idx === questions.length - 1 && q.id in answers;

  function pick(i: number) {
    const next = { ...answers, [q.id]: i };
    setAnswers(next);
    setTimeout(() => {
      if (idx < questions.length - 1) setIdx(idx + 1);
    }, 150);
  }

  function submit() {
    start(async () => {
      try {
        await submitVocab(answers);
      } catch (err) {
        // redirect() 内部会 throw NEXT_REDIRECT — 忽略
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast.error("提交失败：" + (err as Error).message);
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">词汇测试</h1>
          <p className="text-sm text-muted-foreground">第 {idx + 1} / {questions.length} 题 · 已作答 {done}</p>
        </div>
        <Countdown minutes={8} onExpire={submit} />
      </div>

      <Progress value={(done / questions.length) * 100} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl">{q.prompt}</CardTitle>
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Level {q.level}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {q.options.map((opt, i) => {
            const picked = answers[q.id] === i;
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={pending}
                className={
                  "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted " +
                  (picked ? "border-primary bg-primary/5" : "")
                }
              >
                <span className="mr-2 font-mono text-muted-foreground">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
          上一题
        </Button>
        {canSubmit ? (
          <Button onClick={submit} disabled={pending}>
            {pending ? "提交中..." : "提交词汇测试"}
          </Button>
        ) : (
          <Button
            onClick={() => setIdx(Math.min(questions.length - 1, idx + 1))}
            disabled={idx === questions.length - 1}
          >
            下一题
          </Button>
        )}
      </div>
    </div>
  );
}
