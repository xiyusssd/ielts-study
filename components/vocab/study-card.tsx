"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { GRADE_LABELS, type Grade } from "@/lib/srs/fsrs";
import { reviewWord } from "@/lib/vocab/actions";
import { playWord } from "@/lib/audio/play";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SessionSummary } from "@/components/session-summary";
import { Volume2, Eye } from "lucide-react";

type Word = {
  id: string;
  spelling: string;
  ipa: string | null;
  level: number;
  translations: string;
  examples: string;
};

type Item = { word: Word; isNew: boolean };

export function StudyCard({ items, remaining }: { items: Item[]; remaining: number }) {
  const router = useRouter();
  // 活动队列(支持"重点复习没记牢的"重开)
  const [queue, setQueue] = useState<Item[]>(items);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  // 掌握统计：记住了(grade≥2) vs 没记牢(grade≤1，收进重练本)
  const [masteredCount, setMasteredCount] = useState(0);
  const [weakItems, setWeakItems] = useState<Item[]>([]);
  const [pending, start] = useTransition();

  function restart(newQueue: Item[]) {
    setQueue(newQueue);
    setIdx(0);
    setFlipped(false);
    setDone(0);
    setMasteredCount(0);
    setWeakItems([]);
  }

  if (idx >= queue.length) {
    const total = queue.length;
    const rate = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
    return (
      <SessionSummary
        title="今日学习完成！"
        stats={[
          { value: done, label: "已过" },
          { value: masteredCount, label: `记住了 · ${rate}%`, tone: "success" },
          { value: weakItems.length, label: "没记牢", tone: "orange" },
        ]}
      >
        <Button asChild variant="outline">
          <Link href="/vocab">返回词汇首页</Link>
        </Button>
        {weakItems.length > 0 && (
          <Button variant="secondary" onClick={() => restart(weakItems)}>
            重点复习没记牢的（{weakItems.length}）
          </Button>
        )}
        <Button asChild>
          <Link href="/">回到 Dashboard</Link>
        </Button>
      </SessionSummary>
    );
  }

  const item = queue[idx];
  const translations = JSON.parse(item.word.translations) as { pos: string; meaning: string }[];
  const examples = JSON.parse(item.word.examples) as { en: string; zh: string }[];
  const progress = (idx / queue.length) * 100;

  function playTTS() {
    playWord(item.word.spelling);
  }

  function grade(g: Grade) {
    start(async () => {
      try {
        const res = await reviewWord({ wordId: item.word.id, grade: g });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setDone(done + 1);
        // grade≥2 记住了；≤1 收进"没记牢"重练本
        if (g >= 2) setMasteredCount((n) => n + 1);
        else setWeakItems((w) => (w.some((x) => x.word.id === item.word.id) ? w : [...w, item]));
        setIdx(idx + 1);
        setFlipped(false);
      } catch (err) {
        toast.error("提交失败：" + (err as Error).message);
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {idx + 1} / {queue.length} · 剩余 {queue.length - idx - 1}
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

      <Card
        className="cursor-pointer transition-transform hover:scale-[1.01]"
        onClick={() => setFlipped(!flipped)}
      >
        <CardContent className="space-y-6 p-10 text-center">
          <div>
            <div className="mb-2 text-5xl font-bold tracking-wide">{item.word.spelling}</div>
            {item.word.ipa && (
              <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground">
                {item.word.ipa}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playTTS();
                  }}
                  className="rounded-full p-1 hover:bg-muted"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {flipped ? (
            <div className="space-y-4 border-t pt-4 text-left">
              <div className="space-y-1">
                {translations.map((t, i) => (
                  <div key={i} className="text-lg">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">{t.pos}</span>
                    {t.meaning}
                  </div>
                ))}
              </div>
              {examples.length > 0 && (
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  <div className="italic">{examples[0].en}</div>
                  <div className="mt-1 text-muted-foreground">{examples[0].zh}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              点击卡片显示释义
            </div>
          )}
        </CardContent>
      </Card>

      {flipped ? (
        <div className="grid grid-cols-5 gap-2">
          {([0, 1, 2, 3, 4] as Grade[]).map((g) => {
            const label = GRADE_LABELS[g];
            const bg =
              label.hue === "destructive" ? "bg-red-500 hover:bg-red-600" :
              label.hue === "warning" ? "bg-orange-500 hover:bg-orange-600" :
              label.hue === "success" ? "bg-green-500 hover:bg-green-600" :
              "bg-blue-500 hover:bg-blue-600";
            return (
              <button
                key={g}
                onClick={() => grade(g)}
                disabled={pending}
                className={`rounded-lg ${bg} p-3 text-sm font-medium text-white transition disabled:opacity-50`}
                title={label.hint}
              >
                <div className="font-bold">{label.label}</div>
                <div className="mt-1 text-xs opacity-90">{label.hint}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <Button onClick={() => setFlipped(true)} size="lg" className="w-full">
          显示答案
        </Button>
      )}
    </div>
  );
}
