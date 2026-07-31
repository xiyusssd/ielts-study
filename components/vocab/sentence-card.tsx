"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Grade } from "@/lib/srs/fsrs";
import { reviewWord } from "@/lib/vocab/actions";
import { playSentence } from "@/lib/audio/play";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SessionSummary } from "@/components/session-summary";
import { AnswerSheet } from "@/components/vocab/answer-sheet";
import { normSentence } from "@/lib/text/word-diff";
import { Volume2, Flame, Eye, EyeOff, CornerDownLeft, Sparkles, Lightbulb } from "lucide-react";
import { WordTTS } from "@/components/vocab/word-tts";

type Word = {
  id: string;
  spelling: string;
  ipa: string | null;
  level: number;
  translations: string;
  examples: string;
};
type Item = { word: Word; isNew: boolean };

export function SentenceCard({ items, aiEnabled = false }: { items: Item[]; aiEnabled?: boolean }) {
  const [queue, setQueue] = useState<Item[]>(items);
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [caret, setCaret] = useState(0);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [done, setDone] = useState(0);
  const [focused, setFocused] = useState(false);
  const [pending, start] = useTransition();
  const [aiLoading, setAiLoading] = useState(false);
  const [easyMode, setEasyMode] = useState(false);
  const [aiOverride, setAiOverride] = useState<Record<number, { en: string; zh: string }>>({});
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [usedHint, setUsedHint] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [wrongItems, setWrongItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!checked) inputRef.current?.focus();
  }, [idx, checked]);

  useEffect(() => {
    setShowSkeleton(true);
    setUsedHint(false);
  }, [idx]);

  function restart(newQueue: Item[]) {
    setQueue(newQueue);
    setIdx(0);
    setDone(0);
    setValue("");
    setCaret(0);
    setChecked(false);
    setCorrect(false);
    setStreak(0);
    setMaxStreak(0);
    setWrongItems([]);
    setAiOverride({});
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <h2 className="text-2xl font-bold">暂无可练句子</h2>
            <p className="text-muted-foreground">当前队列里的词都没有例句，换翻卡或单词拼写试试。</p>
            <Button asChild>
              <Link href="/vocab">返回词汇首页</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (idx >= queue.length) {
    const total = queue.length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    return (
      <SessionSummary
        title="句子拼写完成！"
        stats={[
          { value: `${done}/${total}`, label: `答对 · ${rate}%` },
          { value: maxStreak, label: "最高连击", tone: "orange" },
          { value: wrongItems.length, label: "答错", tone: "danger" },
        ]}
      >
        <Button asChild variant="outline">
          <Link href="/vocab">返回词汇首页</Link>
        </Button>
        {wrongItems.length > 0 && (
          <Button variant="secondary" onClick={() => restart(wrongItems)}>
            只练错题（{wrongItems.length}）
          </Button>
        )}
        <Button onClick={() => restart(items)}>再来一轮</Button>
      </SessionSummary>
    );
  }

  const item = queue[idx];
  const presetExamples = JSON.parse(item.word.examples) as { en: string; zh: string }[];
  const example = aiOverride[idx] ?? presetExamples[0];
  const expectedWords = example.en.split(/\s+/).filter(Boolean);
  const progress = (idx / queue.length) * 100;

  function playAudio() {
    if (example) playSentence(item.word.spelling, example.en);
  }

  async function genAiSentence() {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/vocab/gen-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: item.word.spelling, level: easyMode ? "easy" : "standard" }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "生成失败");
        return;
      }
      setAiOverride((m) => ({ ...m, [idx]: { en: data.en, zh: data.zh } }));
      setValue("");
      setCaret(0);
      setChecked(false);
      setCorrect(false);
      setUsedHint(false);
      toast.success("已换一句");
    } catch (err) {
      const msg =
        (err as Error).name === "TimeoutError"
          ? "生成超时，请稍后重试"
          : (err as Error).message;
      toast.error("生成失败：" + msg);
    } finally {
      setAiLoading(false);
    }
  }

  function check() {
    if (checked || pending) return;
    const ok = normSentence(value) === normSentence(example.en);
    setCorrect(ok);
    setChecked(true);
    if (ok && !usedHint) {
      setStreak((s) => {
        const ns = s + 1;
        setMaxStreak((m) => Math.max(m, ns));
        return ns;
      });
    } else {
      setStreak(0);
    }
    playAudio();
  }

  function nextCard() {
    const grade: Grade = correct ? (usedHint ? 1 : 2) : 0;
    if (!correct) setWrongItems((w) => (w.some((x) => x.word.id === item.word.id) ? w : [...w, item]));
    start(async () => {
      try {
        const res = await reviewWord({ wordId: item.word.id, grade });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setDone(done + (correct ? 1 : 0));
        setIdx(idx + 1);
        setValue("");
        setCaret(0);
        setChecked(false);
        setCorrect(false);
      } catch (err) {
        toast.error("提交失败：" + (err as Error).message);
      }
    });
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!checked) check();
      else nextCard();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-app-shell"
      onClick={() => inputRef.current?.focus()}
    >
      {/* 顶栏：进度 + 连击 + 工具 + 退出 */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-4 md:px-10">
        <div className="text-sm font-medium text-muted-foreground nums">
          {idx + 1} / {queue.length}
        </div>
        <Progress value={progress} className="h-1.5 flex-1" />
        {streak >= 2 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600 dark:bg-orange-900/30">
            <Flame className="h-3 w-3" /> {streak}
          </span>
        )}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {aiEnabled && (
            <>
              <button
                type="button"
                onClick={() => setEasyMode((v) => !v)}
                className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                title="换 AI 句时的难度"
              >
                {easyMode ? "简单" : "标准"}
              </button>
              <button
                type="button"
                onClick={genAiSentence}
                disabled={aiLoading}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
                title="用 AI 换一句新例句"
              >
                <Sparkles className="h-3 w-3" />
                {aiLoading ? "生成中…" : "换 AI 句"}
              </button>
            </>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link href="/vocab">退出</Link>
          </Button>
        </div>
      </div>

      {/* 中间：中文提示 + 发音 + 整句横线格子 */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-6">
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={playAudio}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
            title="朗读整句"
          >
            <Volume2 className="h-5 w-5" />
          </button>
          <WordTTS text={item.word.spelling} />
          {item.isNew && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30">
              新词
            </span>
          )}
        </div>

        <p className="max-w-3xl text-center text-2xl font-medium leading-relaxed md:text-3xl">
          {example.zh}
        </p>

        <div className="w-full max-w-5xl">
          {showSkeleton || checked ? (
            <AnswerSheet
              expectedWords={expectedWords}
              typed={value}
              caret={caret}
              checked={checked}
              focused={focused}
              size="md"
            />
          ) : (
            <p className="rounded-2xl bg-muted/30 px-6 py-8 text-center text-lg text-foreground">
              {value || <span className="text-muted-foreground/50">凭中文默写整句英文，回车检查</span>}
            </p>
          )}
        </div>

        {checked && !correct && (
          <div className="max-w-3xl rounded-2xl bg-muted/50 p-4 text-center">
            <div className="mb-1 text-xs text-muted-foreground">正确答案</div>
            <p className="text-lg italic">{example.en}</p>
          </div>
        )}
        {checked && correct && (
          <div className="text-base font-medium text-success">完全正确 🎉</div>
        )}
      </div>

      {/* 隐藏输入：捕获键盘 */}
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => {
          if (checked || pending) return;
          setValue(e.target.value);
          setCaret(e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={onKey}
        onKeyUp={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
        onClick={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        readOnly={checked || pending}
        rows={1}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="pointer-events-none absolute h-0 w-0 resize-none opacity-0"
        aria-label="句子拼写输入"
      />

      {/* 底栏：提示 + 检查 */}
      <div className="border-t border-border/60 bg-card/60 px-6 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div onClick={(e) => e.stopPropagation()}>
            {!checked && (
              <Button
                type="button"
                onClick={() => {
                  setShowSkeleton((v) => !v);
                  setUsedHint(true);
                }}
                variant="outline"
                size="sm"
              >
                {showSkeleton ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showSkeleton ? "隐藏横线" : "看横线"}
              </Button>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            {!checked ? (
              <Button onClick={check} size="lg" disabled={!value.trim() || pending}>
                检查 <CornerDownLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={nextCard} size="lg" disabled={pending}>
                {idx + 1 >= queue.length ? "完成" : "下一句"} <CornerDownLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
