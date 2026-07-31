"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { SessionSummary } from "@/components/session-summary";
import { normSentence, wordDiff } from "@/lib/text/word-diff";
import { Play, ArrowLeft, ArrowRight, RotateCw, Lightbulb, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 精听模式：把 transcript 按句号 / 换行拆成句子，
 * 逐句循环播放 + 用户输入 + 逐词对照。
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
  const allSentences = splitSentences(transcript);
  // 活动队列(支持"只练错句"重开)
  const [queue, setQueue] = useState<string[]>(allSentences);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [showSkeleton, setShowSkeleton] = useState(false); // 首字母骨架提示
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);

  const current = queue[idx];

  // 切句自动播放 + 聚焦；判分后聚焦「下一句」
  useEffect(() => {
    if (idx >= queue.length) return;
    if (checked) nextBtnRef.current?.focus();
    else {
      inputRef.current?.focus();
      play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, checked]);

  useEffect(() => {
    setShowSkeleton(false);
  }, [idx]);

  function restart(newQueue: string[]) {
    setQueue(newQueue);
    setIdx(0);
    setInput("");
    setChecked(false);
    setCorrectCount(0);
    setWrong([]);
    setShowSkeleton(false);
  }

  // 完成页
  if (idx >= queue.length) {
    const total = queue.length;
    const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <div className="mx-auto max-w-3xl">
        <SessionSummary
          title="精听完成！"
          stats={[
            { value: `${correctCount}/${total}`, label: `全对 · ${rate}%` },
            { value: wrong.length, label: "有出入", tone: "danger" },
          ]}
        >
          <Button asChild variant="outline">
            <Link href="/listening">返回听力</Link>
          </Button>
          {wrong.length > 0 && (
            <Button variant="secondary" onClick={() => restart(wrong)}>
              只练错句（{wrong.length}）
            </Button>
          )}
          <Button onClick={() => restart(allSentences)}>再来一轮</Button>
          <Button asChild variant="outline">
            <Link href={`/listening/${passageId}`}>切回做题</Link>
          </Button>
        </SessionSummary>
      </div>
    );
  }

  function play() {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(current);
    u.lang = "en-US";
    u.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function check() {
    if (checked) return;
    const ok = normSentence(input) === normSentence(current);
    setChecked(true);
    if (ok) setCorrectCount((n) => n + 1);
    else setWrong((w) => (w.includes(current) ? w : [...w, current]));
  }

  function move(delta: number) {
    const next = idx + delta;
    if (next < 0 || next > queue.length) return;
    setIdx(next);
    setInput("");
    setChecked(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!checked) {
        if (input.trim()) check();
      } else {
        move(1);
      }
    }
  }

  const diff = checked ? wordDiff(input, current) : [];
  const expectedWords = current.split(/\s+/).filter(Boolean);

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
            句 {idx + 1} / {queue.length} · 全对 {correctCount} · 有出入 {wrong.length}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/listening/${passageId}`}>切回做题模式</Link>
        </Button>
      </div>

      <Progress value={(idx / queue.length) * 100} />

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
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={3}
            placeholder="听完后输入你听到的内容，回车对照..."
            disabled={checked}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="font-serif"
          />

          {/* 提示台阶：首字母骨架 */}
          {!checked && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSkeleton((v) => !v)}
                  className="inline-flex items-center gap-1 rounded border border-border/60 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                  title="显示每个词的首字母骨架 + 词数"
                >
                  <Lightbulb className="h-3 w-3" /> {showSkeleton ? "隐藏骨架" : "看首字母"}
                </button>
                <span className="text-xs text-muted-foreground">{expectedWords.length} 个词</span>
              </div>
              {showSkeleton && (
                <p className="flex flex-wrap gap-x-2 gap-y-1 rounded-md bg-amber-50 p-2 font-mono text-sm text-muted-foreground dark:bg-amber-900/15">
                  {expectedWords.map((w, i) => (
                    <span key={i}>{w[0] + "_".repeat(Math.max(0, w.length - 1))}</span>
                  ))}
                </p>
              )}
            </div>
          )}

          {!checked ? (
            <div className="flex gap-2">
              <Button onClick={check} disabled={!input.trim()}>
                提交对照 <CornerDownLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={play}>
                <RotateCw className="h-4 w-4" />
                再听一次
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 逐词对照：红底=你漏/错的词 */}
              <div
                className={cn(
                  "rounded-md border p-3 text-sm",
                  wrong.includes(current)
                    ? "border-red-500/60 bg-red-50 dark:bg-red-900/20"
                    : "border-green-500/60 bg-green-50 dark:bg-green-900/20",
                )}
              >
                <div className="mb-1 text-xs text-muted-foreground">
                  {wrong.includes(current) ? "原文（红=你漏/错的词）：" : "完全正确 🎉"}
                </div>
                <p className="flex flex-wrap gap-x-1.5 gap-y-1 leading-relaxed">
                  {diff.map((d, i) => (
                    <span
                      key={i}
                      className={d.ok ? "text-foreground" : "rounded bg-destructive/15 px-1 font-medium text-destructive"}
                    >
                      {d.word}
                    </span>
                  ))}
                </p>
                <div className="mt-2 border-t pt-2">
                  <div className="text-xs text-muted-foreground">你的输入</div>
                  <div className="font-mono text-muted-foreground">{input}</div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => move(-1)} disabled={idx === 0}>
                  <ArrowLeft className="h-4 w-4" />
                  上一句
                </Button>
                <Button ref={nextBtnRef} onClick={() => move(1)}>
                  {idx + 1 >= queue.length ? "完成" : "下一句"}
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
  // 用换行 + 句尾标点切分，保留较完整语义；去掉说话人前缀(如 "Receptionist:")——精听默写的是话，不是标签
  return text
    .split(/\n+/)
    .flatMap((paragraph) => paragraph.split(/(?<=[.!?])\s+/))
    .map((s) => s.replace(/^\s*[A-Z][a-zA-Z ]{0,20}:\s*/, "").trim())
    .filter((s) => s.length > 0 && /[a-zA-Z]/.test(s));
}
