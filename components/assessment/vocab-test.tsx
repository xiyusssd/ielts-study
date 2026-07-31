"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { GenVocabQ } from "@/lib/assessment/vocab-types";
import { NONE_OF_ABOVE } from "@/lib/assessment/vocab-types";
import { submitVocab } from "@/lib/assessment/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/assessment/countdown";
import { Check, X } from "lucide-react";
import { WordTTS } from "@/components/vocab/word-tts";

const POS_LABELS: Record<string, string> = {
  noun: "名词", verb: "动词", adj: "形容词", adv: "副词",
  prep: "介词", conj: "连词", pron: "代词", art: "冠词", int: "感叹词", num: "数词",
};

export function VocabTest({ questions }: { questions: GenVocabQ[] }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [pending, start] = useTransition();
  const q = questions[idx];
  const done = Object.keys(answers).length;
  const correctCount = questions.filter((qq) => qq.id in answers && answers[qq.id] === qq.answer).length;
  const answered = q.id in answers;
  const isCorrect = answered && answers[q.id] === q.answer;
  const canSubmit = idx === questions.length - 1 && answered;
  const pickedOpt = answered ? q.options[answers[q.id]] : null;
  const correctOpt = q.options[q.answer];

  function pick(i: number) {
    // 已作答则锁定，不允许改（保证判分真实）
    if (answered || pending) return;
    setAnswers({ ...answers, [q.id]: i });
  }

  function submit() {
    start(async () => {
      try {
        // 下发的题目规格（含答案键 + 单词释义）随答案一起交回，服务端按规格重判分并存逐词回顾
        const spec = questions.map((qq) => ({
          id: qq.id,
          level: qq.level,
          answer: qq.answer,
          word: qq.word,
          meaning: qq.meaning,
        }));
        await submitVocab({ spec, answers });
      } catch (err) {
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

      <Card key={q.id} className="animate-in-slide">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-3xl">{q.word}</CardTitle>
                <WordTTS text={q.word} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {q.ipa && <span className="font-mono text-sm text-muted-foreground">{q.ipa}</span>}
                {q.pos && <Badge variant="secondary">{POS_LABELS[q.pos] ?? q.pos}</Badge>}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {q.cefr && <Badge variant="outline">{q.cefr}</Badge>}
              <Badge variant="secondary">Lv {q.level}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {q.options.map((opt, i) => {
            const picked = answers[q.id] === i;
            const isAnswer = q.answer === i;
            const pickedWord = pickedOpt?.fromWord ?? null;
            // 作答后：正确项一律标绿；错选项只在自己的选项上直接展示对应单词意思
            let cls = "border-input";
            let icon = null;
            if (answered) {
              if (isAnswer) {
                cls = "border-success bg-success/10 text-success";
                icon = <Check className="h-5 w-5 shrink-0 text-success" />;
              } else if (picked) {
                cls = "border-destructive bg-destructive/10 text-destructive";
                icon = <X className="h-5 w-5 shrink-0 text-destructive" />;
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
                <span className="flex-1">
                  {opt.text}
                  {answered && picked && !isCorrect && pickedWord && pickedWord !== NONE_OF_ABOVE && (
                    <span className="mt-1 block text-xs opacity-90">这是「{pickedWord}」的意思</span>
                  )}
                </span>
                {icon}
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
            disabled={idx === questions.length - 1 || !answered}
          >
            下一题
          </Button>
        )}
      </div>
    </div>
  );
}
