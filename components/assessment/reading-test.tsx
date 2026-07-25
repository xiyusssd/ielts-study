"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ReadingQ } from "@/lib/assessment/seed-data";
import { submitReading } from "@/lib/assessment/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Countdown } from "@/components/assessment/countdown";

const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"];

export function ReadingTest({
  passage,
  questions,
}: {
  passage: { title: string; content: string };
  questions: ReadingQ[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      try {
        await submitReading(answers);
      } catch (err) {
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast.error("提交失败：" + (err as Error).message);
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">阅读测试</h1>
          <p className="text-sm text-muted-foreground">1 篇文章 · 8 道题 · 20 分钟</p>
        </div>
        <Countdown minutes={20} onExpire={submit} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="max-h-[70vh] overflow-y-auto">
          <CardContent className="p-6">
            <h2 className="mb-3 text-xl font-semibold">{passage.title}</h2>
            <div className="whitespace-pre-wrap text-sm leading-7">{passage.content}</div>
          </CardContent>
        </Card>

        <Card className="max-h-[70vh] overflow-y-auto">
          <CardContent className="space-y-4 p-6">
            {questions.map((q, i) => (
              <div key={q.id} className="space-y-2 border-b pb-4 last:border-b-0">
                <div className="text-sm font-medium">
                  <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                  {q.prompt}
                </div>
                {q.type === "tfng" ? (
                  <div className="flex flex-wrap gap-2">
                    {TFNG_OPTIONS.map((opt) => {
                      const picked = answers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                          className={
                            "rounded-md border px-3 py-1 text-xs font-mono transition-colors hover:bg-muted " +
                            (picked ? "border-primary bg-primary/10 font-semibold" : "")
                          }
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {q.options?.map((opt, oi) => {
                      const letter = String.fromCharCode(65 + oi);
                      const picked = answers[q.id] === letter;
                      return (
                        <button
                          key={oi}
                          onClick={() => setAnswers({ ...answers, [q.id]: letter })}
                          className={
                            "block w-full rounded-md border p-2 text-left text-sm hover:bg-muted " +
                            (picked ? "border-primary bg-primary/5" : "")
                          }
                        >
                          <span className="mr-2 font-mono text-muted-foreground">{letter}.</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending} size="lg">
          {pending ? "提交中..." : "提交阅读测试"}
        </Button>
      </div>
    </div>
  );
}
