"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { finishDictation, type DictationScope } from "@/lib/vocab/dictation";
import { playWord } from "@/lib/audio/play";
import { useCurrentWord } from "@/lib/vocab/current-word";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SessionSummary } from "@/components/session-summary";
import { AnswerSheet } from "@/components/vocab/answer-sheet";
import { Volume2, Check, X, CornerDownLeft, Flame } from "lucide-react";

export type DictationItem = {
  wordId: string;
  spelling: string;
  ipa: string | null;
  translations: { pos: string; meaning: string }[];
};

type Result = { wordId: string; spelling: string; wrongAnswer: string };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function DictationRunner({
  items,
  scope,
  scopeId,
  label,
}: {
  items: DictationItem[];
  scope: DictationScope;
  scopeId: string | null;
  label: string;
}) {
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [caret, setCaret] = useState(0);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const startAtRef = useRef(Date.now());
  const item = idx < items.length ? items[idx] : null;
  useCurrentWord(item?.wordId);

  // 每张卡片自动发音 + 聚焦
  useEffect(() => {
    if (!checked && item) {
      inputRef.current?.focus();
      playWord(item.spelling);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // 拼对自动判过：绿色提示后自动进入下一词
  useEffect(() => {
    if (!checked || !correct) return;
    const t = setTimeout(() => {
      setIdx((i) => i + 1);
      setValue("");
      setCaret(0);
      setChecked(false);
      setCorrect(false);
    }, 700);
    return () => clearTimeout(t);
  }, [checked, correct]);

  // 结束：提交成绩
  useEffect(() => {
    if (idx < items.length || submitting || items.length === 0) return;
    const duration = Math.round((Date.now() - startAtRef.current) / 1000);
    const wrong = results.filter((r) => r.wrongAnswer !== "");
    const correctCount = results.length - wrong.length;
    setSubmitting(true);
    start(async () => {
      const res = await finishDictation({
        scope,
        scopeId,
        total: items.length,
        correct: correctCount,
        duration,
        mistakes: wrong.map((r) => ({ wordId: r.wordId, wrongAnswer: r.wrongAnswer })),
        correctWordIds: scope === "mistakes" ? results.filter((r) => r.wrongAnswer === "").map((r) => r.wordId) : undefined,
      });
      if (!res.ok) toast.error(res.error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <SessionSummary title="没有可听写的单词" stats={[]}>
          <Button asChild variant="outline">
            <Link href="/vocab">返回词汇首页</Link>
          </Button>
        </SessionSummary>
      </div>
    );
  }

  if (!item) {
    const wrong = results.filter((r) => r.wrongAnswer !== "");
    const rate = results.length > 0 ? Math.round(((results.length - wrong.length) / results.length) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl">
        <SessionSummary
          title={`听写完成 · ${label}`}
          stats={[
            { value: `${results.length - wrong.length}/${results.length}`, label: `答对 · ${rate}%`, tone: "success" },
            { value: wrong.length, label: "错词已收集", tone: wrong.length > 0 ? "orange" : "default" },
            { value: results.length, label: "总词数" },
          ]}
        >
          <Button asChild variant="outline">
            <Link href="/vocab/dictation">再来一轮</Link>
          </Button>
          {wrong.length > 0 && (
            <Button asChild>
              <Link href="/vocab/mistakes">查看错词本</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/vocab">返回词汇首页</Link>
          </Button>
        </SessionSummary>
      </div>
    );
  }

  const progress = (idx / items.length) * 100;
  const wrongCount = results.filter((r) => r.wrongAnswer !== "").length;
  const answered = results.length;

  const check = () => {
    if (checked || pending) return;
    const ok = norm(value) === norm(item.spelling);
    setChecked(true);
    setCorrect(ok);
    setResults((rs) => [...rs, { wordId: item.wordId, spelling: item.spelling, wrongAnswer: ok ? "" : value }]);
    if (ok) playWord(item.spelling);
  };

  function nextCard() {
    if (pending || !checked) return;
    setIdx((i) => i + 1);
    setValue("");
    setCaret(0);
    setChecked(false);
    setCorrect(false);
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
      data-dictation-word={item.spelling}
    >
      {/* 顶栏：进度 + 正确率 + 退出 */}
      <div className="flex items-center gap-4 px-6 py-4 md:px-10">
        <div className="text-sm font-medium text-muted-foreground nums">
          {idx + 1} / {items.length}
        </div>
        <Progress value={progress} className="h-1.5 flex-1" />
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary" title="实时正确率">
            <Flame className="h-3 w-3" />
            {answered > 0 ? Math.round(((answered - wrongCount) / answered) * 100) : 100}%
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
          <Button asChild variant="ghost" size="sm">
            <Link href="/vocab" onClick={(e) => e.stopPropagation()}>
              退出
            </Link>
          </Button>
        </div>
      </div>

      {/* 中间：发音 + 释义 + 横线格子 */}
      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-8">
        <div className="space-y-4 text-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playWord(item.spelling);
            }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:scale-105 hover:bg-primary/20"
            title="再听一遍"
          >
            <Volume2 className="h-7 w-7" />
          </button>
          {!checked && item.ipa && (
            <div className="text-lg text-muted-foreground">{item.ipa}</div>
          )}
          <div className="space-y-1">
            {item.translations.map((t, i) => (
              <div key={i} className="text-xl md:text-2xl">
                <span className="mr-2 font-mono text-sm text-muted-foreground">{t.pos}</span>
                {t.meaning}
              </div>
            ))}
          </div>
        </div>

        <AnswerSheet
          expectedWords={[item.spelling]}
          typed={value}
          caret={caret}
          checked={checked}
          focused={focused}
          size="lg"
        />

        {checked && (
          <div
            className={
              "flex items-center gap-2 text-base font-medium " +
              (correct ? "text-success" : "text-destructive")
            }
          >
            {correct ? (
              <>
                <Check className="h-5 w-5" />
                拼写正确
                <span className="font-bold tracking-wide">{item.spelling}</span>
              </>
            ) : (
              <>
                <X className="h-5 w-5" />
                正确拼写：
                <span className="font-bold tracking-wide">{item.spelling}</span>
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
        aria-label="听写输入"
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
              {idx + 1 >= items.length ? "完成" : "下一个"}{" "}
              <CornerDownLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}