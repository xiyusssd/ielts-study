"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Play, ArrowLeft, ArrowRight, CheckCircle2, XCircle, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 精听模式：把 transcript 按句号 / 换行拆成句子，
 * 逐句循环播放 + 用户输入 + 对比原文。
 */
export function DictationMode({
  passageId,
  title,
  transcript,
}: {
  passageId: string;
  title: string;
  transcript: string;
}) {
  const sentences = splitSentences(transcript);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [progress, setProgress] = useState<Record<number, "correct" | "wrong">>({});

  const current = sentences[idx];

  function play() {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(current);
    u.lang = "en-US";
    u.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function check() {
    setChecked(true);
    const ok = normalize(input) === normalize(current);
    setProgress({ ...progress, [idx]: ok ? "correct" : "wrong" });
  }

  function move(delta: number) {
    const next = idx + delta;
    if (next < 0 || next >= sentences.length) return;
    setIdx(next);
    setInput("");
    setChecked(false);
  }

  const doneCount = Object.keys(progress).length;
  const correctCount = Object.values(progress).filter((v) => v === "correct").length;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/listening">
              <ArrowLeft className="h-4 w-4" /> 返回听力
            </Link>
          </Button>
          <h1 className="mt-2 text-2xl font-bold">精听 · {title}</h1>
          <p className="text-sm text-muted-foreground">
            句 {idx + 1} / {sentences.length} · 完成 {doneCount} · 正确 {correctCount}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/listening/${passageId}`}>切回做题模式</Link>
        </Button>
      </div>

      <Progress value={((idx + 1) / sentences.length) * 100} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">听句子并输入</CardTitle>
            <Button size="sm" onClick={play}>
              <Play className="h-4 w-4" />
              播放本句
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="听完后输入你听到的内容..."
            disabled={checked}
            className="font-serif"
          />
          {!checked ? (
            <div className="flex gap-2">
              <Button onClick={check} disabled={!input.trim()}>
                提交对照
              </Button>
              <Button variant="outline" onClick={play}>
                <RotateCw className="h-4 w-4" />
                再听一次
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className={cn(
                  "flex items-start gap-2 rounded-md border p-3 text-sm",
                  progress[idx] === "correct"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-red-500 bg-red-50 dark:bg-red-900/20",
                )}
              >
                {progress[idx] === "correct" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-muted-foreground">你的输入</div>
                    <div className="font-mono">{input}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">原文</div>
                    <div className="font-mono">{current}</div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => move(-1)} disabled={idx === 0}>
                  <ArrowLeft className="h-4 w-4" />
                  上一句
                </Button>
                <Button onClick={() => move(1)} disabled={idx === sentences.length - 1}>
                  下一句
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function splitSentences(text: string): string[] {
  // 用换行 + 句尾标点切分，保留较完整语义
  return text
    .split(/\n+/)
    .flatMap((paragraph) => paragraph.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /[a-zA-Z]/.test(s));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?"'。，！？：；]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^(receptionist|caller|tutor|sara|ben):\s*/i, "")
    .trim();
}
