"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Grade } from "@/lib/srs/fsrs";
import { reviewWord } from "@/lib/vocab/actions";
import { playWord, playSentence } from "@/lib/audio/play";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SessionSummary } from "@/components/session-summary";
import { AnswerSheet } from "@/components/vocab/answer-sheet";
import { Volume2, Flame, Check, X, CornerDownLeft } from "lucide-react";

type Word = {
  id: string;
  spelling: string;
  ipa: string | null;
  level: number;
  translations: string;
  examples: string;
};

type Item = { word: Word; isNew: boolean };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

// 把例句里的目标词挖成下划线，保留语境
function blankSentence(en: string, word: string): string {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "ig");
  return en.replace(re, "____");
}

export function SpellCard({ items }: { items: Item[] }) {
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [caret, setCaret] = useState(0);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [done, setDone] = useState(0);
  const [focused, setFocused] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!checked) inputRef.current?.focus();
  }, [idx, checked]);

  if (idx >= items.length) {
    const rate = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
    return (
      <SessionSummary
        title="拼写练习完成！"
        stats={[
          { value: `${done}/${items.length}`, label: `答对 · ${rate}%`, tone: "success" },
          { value: items.length - done, label: "答错", tone: "orange" },
        ]}
      >
        <Button asChild variant="outline">
          <Link href="/vocab">返回词汇首页</Link>
        </Button>
        <Button asChild>
          <Link href="/">回到 Dashboard</Link>
        </Button>
      </SessionSummary>
    );
  }

  const item = items[idx];
  const translations = JSON.parse(item.word.translations) as { pos: string; meaning: string }[];
  const examples = JSON.parse(item.word.examples) as { en: string; zh: string }[];
  const example = examples[0];
  const progress = (idx / items.length) * 100;

  function playTTS() {
    playWord(item.word.spelling);
  }
  function playExample() {
    if (example) playSentence(item.word.spelling, example.en);
  }

  function check() {
    if (checked || pending) return;
    const ok = norm(value) === norm(item.word.spelling);
    setCorrect(ok);
    setChecked(true);
    if (ok) playTTS();
  }

  function nextCard() {
    const grade: Grade = correct ? 2 : 0;
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
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!checked) check();
    else nextCard();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-app-shell"
      onClick={() => inputRef.current?.focus()}
    >
      {/* 顶栏：进度 + 退出 */}
      <div className="flex items-center gap-4 px-6 py-4 md:px-10">
        <div className="text-sm font-medium text-muted-foreground nums">
          {idx + 1} / {items.length}
        </div>
        <Progress value={progress} className="h-1.5 flex-1" />
        <div className="flex items-center gap-2">
          {item.isNew && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30">
              新词
            </span>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link href="/vocab" onClick={(e) => e.stopPropagation()}>
              退出
            </Link>
          </Button>
        </div>
      </div>

      {/* 中间：释义 + 音标 + 横线格子 */}
      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-8">
        <div className="space-y-4 text-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playTTS();
            }}
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
            title="发音"
          >
            <Volume2 className="h-6 w-6" />
          </button>
          {item.word.ipa && (
            <div className="text-lg text-muted-foreground">{item.word.ipa}</div>
          )}
          <div className="space-y-1">
            {translations.map((t, i) => (
              <div key={i} className="text-xl md:text-2xl">
                <span className="mr-2 font-mono text-sm text-muted-foreground">{t.pos}</span>
                {t.meaning}
              </div>
            ))}
          </div>
        </div>

        <AnswerSheet
          expectedWords={[item.word.spelling]}
          typed={value}
          caret={caret}
          checked={checked}
          focused={focused}
          size="lg"
        />

        {example && (
          <div className="max-w-2xl text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playExample();
              }}
              className="mr-1 inline-flex align-middle text-muted-foreground hover:text-foreground"
              title="朗读整句"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <span className="italic">
              {checked ? example.en : blankSentence(example.en, item.word.spelling)}
            </span>
            <div className="mt-1">{example.zh}</div>
          </div>
        )}

        {checked && (
          <div
            className={
              "flex items-center gap-2 text-base font-medium " +
              (correct ? "text-success" : "text-destructive")
            }
          >
            {correct ? (
              <>
                <Check className="h-5 w-5" /> 拼写正确
              </>
            ) : (
              <>
                <X className="h-5 w-5" /> 正确拼写：
                <span className="font-bold tracking-wide">{item.word.spelling}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* 隐藏输入：捕获键盘 */}
      <input
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
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-label="拼写输入"
      />

      {/* 底栏：操作 */}
      <div className="border-t border-border/60 bg-card/60 px-6 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-xl">
          {!checked ? (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                check();
              }}
              size="lg"
              className="w-full"
              disabled={!value.trim()}
            >
              检查 <CornerDownLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                nextCard();
              }}
              size="lg"
              className="w-full"
              disabled={pending}
            >
              {pending ? "提交中..." : idx + 1 >= items.length ? "完成" : "下一个"}{" "}
              <CornerDownLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
