"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { Grade } from "@/lib/srs/fsrs";
import { reviewWord } from "@/lib/vocab/actions";
import { playWord, playSentence } from "@/lib/audio/play";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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

// 把例句里的目标词挖成下划线（保留首字母提示可选，这里全挖）
function blankSentence(en: string, word: string): string {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "ig");
  return en.replace(re, "_".repeat(Math.max(4, word.length)));
}

export function SpellCard({ items }: { items: Item[] }) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [done, setDone] = useState(0);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!checked) inputRef.current?.focus();
  }, [idx, checked]);

  if (idx >= items.length) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="border-green-500 bg-green-50 dark:bg-green-900/20">
          <CardContent className="space-y-4 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <Flame className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">拼写练习完成！</h2>
            <p className="text-muted-foreground">共完成 {done} 个单词</p>
            <div className="flex justify-center gap-2">
              <Button asChild variant="outline">
                <Link href="/vocab">返回词汇首页</Link>
              </Button>
              <Button asChild>
                <Link href="/">回到 Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
    // 拼写结果映射到 FSRS 评分：对=good(2)，错=again(0)
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
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {idx + 1} / {items.length} · 剩余 {items.length - idx - 1}
        </div>
        <div className="flex items-center gap-2">
          {item.isNew && (
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30">
              新词
            </span>
          )}
          <span className="rounded bg-muted px-2 py-0.5 text-xs">Level {item.word.level}</span>
        </div>
      </div>

      <Progress value={progress} />

      <Card>
        <CardContent className="space-y-5 p-8">
          {/* 提示：释义 + 音标 + 发音，隐藏拼写 */}
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              {item.word.ipa && <span className="text-lg">{item.word.ipa}</span>}
              <button onClick={playTTS} className="rounded-full p-1 hover:bg-muted" title="发音">
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              {translations.map((t, i) => (
                <div key={i} className="text-lg">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{t.pos}</span>
                  {t.meaning}
                </div>
              ))}
            </div>
          </div>

          {/* 有例句：展示整句并挖空目标词，提供语境；可点喇叭听整句 */}
          {example && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <div className="flex items-start gap-2">
                <button
                  onClick={playExample}
                  className="mt-0.5 shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted"
                  title="朗读整句"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                <span className="italic">
                  {checked ? example.en : blankSentence(example.en, item.word.spelling)}
                </span>
              </div>
              <div className="mt-1 pl-7 text-muted-foreground">{example.zh}</div>
            </div>
          )}

          {/* 输入框 */}
          <div>
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKey}
              disabled={checked || pending}
              placeholder="拼出这个单词，回车检查"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className={
                "text-center text-lg " +
                (checked
                  ? correct
                    ? "border-success text-success"
                    : "border-destructive text-destructive"
                  : "")
              }
            />
            {checked && (
              <div
                className={
                  "mt-3 flex items-center justify-center gap-2 rounded-md p-3 text-sm font-medium " +
                  (correct ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")
                }
              >
                {correct ? (
                  <>
                    <Check className="h-4 w-4" /> 拼写正确：{item.word.spelling}
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" /> 正确拼写是 <span className="font-bold">{item.word.spelling}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!checked ? (
        <Button onClick={check} size="lg" className="w-full" disabled={!value.trim()}>
          <CornerDownLeft className="h-4 w-4" />
          检查（回车）
        </Button>
      ) : (
        <Button onClick={nextCard} size="lg" className="w-full" disabled={pending}>
          {pending ? "提交中..." : idx + 1 >= items.length ? "完成" : "下一个（回车）"}
        </Button>
      )}
    </div>
  );
}
