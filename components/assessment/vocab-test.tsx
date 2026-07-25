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
import { Check, X } from "lucide-react";

export function VocabTest({ questions }: { questions: VocabQ[] }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const q = questions[idx];
  const done = Object.keys(answers).length;
  const correctCount = questions.filter((qq) => qq.id in answers && answers[qq.id] === qq.answer).length;
  const answered = q.id in answers;
  const isCorrect = answered && answers[q.id] === q.answer;
  const canSubmit = idx === questions.length - 1 && answered;

  function pick(i: number) {
    // 已作答则锁定，不允许改（保证判分真实）
    if (answered || pending) return;
    setAnswers({ ...answers, [q.id]: i });
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
          <p className="text-sm text-muted-foreground">
            第 {idx + 1} / {questions.length} 题 · 已作答 {done} · 正确 {correctCount}
          </p>
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
            const isAnswer = q.answer === i;
            // 作答后：正确项一律标绿；错选项标红；未选未答项保持中性
            let cls = "border-input";
            let icon = null;
            if (answered) {
              if (isAnswer) {
                cls = "border-green-500 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300";
                icon = <Check className="h-5 w-5 shrink-0 text-green-600" />;
              } else if (picked) {
                cls = "border-red-500 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300";
                icon = <X className="h-5 w-5 shrink-0 text-red-600" />;
              } else {
                cls = "border-input opacity-60";
              }
            } else if (picked) {
              cls = "border-primary bg-primary/5";
            }
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={answered || pending}
                className={
                  "flex w-full items-center gap-2 rounded-lg border p-3 text-left transition-colors " +
                  (answered ? "cursor-default " : "hover:bg-muted ") +
                  cls
                }
              >
                <span className="mr-1 font-mono text-muted-foreground">
                  {String.fromCharCode(65 + i)}.
                </span>
                <span className="flex-1">{opt}</span>
                {icon}
              </button>
            );
          })}

          {answered && (
            <div
              className={
                "mt-3 flex items-center gap-2 rounded-lg p-3 text-sm font-medium " +
                (isCorrect
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                  : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300")
              }
            >
              {isCorrect ? (
                <>
                  <Check className="h-4 w-4" />
                  回答正确
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  回答错误 · 正确答案是 {String.fromCharCode(65 + q.answer)}. {q.options[q.answer]}
                </>
              )}
            </div>
          )}
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
            disabled={idx === questions.length - 1 || !answered}
          >
            下一题
          </Button>
        )}
      </div>
    </div>
  );
}
