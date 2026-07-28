"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { Grade } from "@/lib/srs/fsrs";
import { reviewWord } from "@/lib/vocab/actions";
import { playSentence } from "@/lib/audio/play";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Volume2, Flame, Eye, EyeOff, CornerDownLeft, Sparkles, Lightbulb } from "lucide-react";

type Word = {
  id: string;
  spelling: string;
  ipa: string | null;
  level: number;
  translations: string;
  examples: string;
};
type Item = { word: Word; isNew: boolean };

// 宽松归一：去首尾空格、压缩空白、小写、去标点。用于整句判分。
function normSentence(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"'`()\[\]{}…—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// 逐词对比：用 LCS(最长公共子序列)对齐，漏词/多词只标真正没答对的词，
// 不会因位移导致后面满屏红。返回每个"正确答案词"是否被答对。
function wordDiff(answer: string, expected: string): { word: string; ok: boolean }[] {
  const a = normSentence(answer).split(" ").filter(Boolean);
  const e = normSentence(expected).split(" ").filter(Boolean);
  const n = a.length;
  const m = e.length;
  // dp[i][j] = a[0..i) 与 e[0..j) 的 LCS 长度
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = a[i - 1] === e[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  // 回溯：标记 e 中处于 LCS 里的词为答对
  const ok = new Array(m).fill(false);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === e[j - 1]) {
      ok[j - 1] = true;
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return e.map((w, k) => ({ word: w, ok: ok[k] }));
}

const PLACEHOLDER = "凭中文/听到的内容，拼出整句英文，回车检查";

export function SentenceCard({ items, aiEnabled = false }: { items: Item[]; aiEnabled?: boolean }) {
  const router = useRouter();
  // 活动队列(支持"只练错题"重开一轮)
  const [queue, setQueue] = useState<Item[]>(items);
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [done, setDone] = useState(0);
  const [listenOnly, setListenOnly] = useState(false); // false=看中文, true=纯听写
  const [pending, start] = useTransition();
  const [aiLoading, setAiLoading] = useState(false);
  const [easyMode, setEasyMode] = useState(false); // 换 AI 句时用更简单的难度
  // 现场 AI 生成的例句覆盖(按 idx 存),优先于预设例句
  const [aiOverride, setAiOverride] = useState<Record<number, { en: string; zh: string }>>({});
  // 提示：已揭示词数 + 首字母骨架 + 本句是否用过提示
  const [revealed, setRevealed] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  // 统计：连击、最高连击、错题收集
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [wrongItems, setWrongItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!checked) inputRef.current?.focus();
  }, [idx, checked]);

  // 切到新卡时重置提示状态
  useEffect(() => {
    setRevealed(0);
    setShowSkeleton(false);
    setUsedHint(false);
  }, [idx]);

  function restart(newQueue: Item[]) {
    setQueue(newQueue);
    setIdx(0);
    setDone(0);
    setValue("");
    setChecked(false);
    setCorrect(false);
    setStreak(0);
    setMaxStreak(0);
    setWrongItems([]);
    setAiOverride({});
  }

  if (idx >= queue.length) {
    const total = queue.length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="border-green-500 bg-green-50 dark:bg-green-900/20">
          <CardContent className="space-y-4 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <Flame className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">句子拼写完成！</h2>
            <div className="flex justify-center gap-6 text-center">
              <div>
                <div className="text-2xl font-bold tabular-nums">{done}/{total}</div>
                <div className="text-xs text-muted-foreground">答对 · {rate}%</div>
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums text-orange-500">{maxStreak}</div>
                <div className="text-xs text-muted-foreground">最高连击</div>
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums text-destructive">{wrongItems.length}</div>
                <div className="text-xs text-muted-foreground">答错</div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline">
                <Link href="/vocab">返回词汇首页</Link>
              </Button>
              {wrongItems.length > 0 && (
                <Button variant="secondary" onClick={() => restart(wrongItems)}>
                  只练错题（{wrongItems.length}）
                </Button>
              )}
              <Button onClick={() => restart(items)}>再来一轮</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const item = queue[idx];
  const presetExamples = JSON.parse(item.word.examples) as { en: string; zh: string }[];
  const example = aiOverride[idx] ?? presetExamples[0];
  const progress = (idx / queue.length) * 100;
  const diff = checked ? wordDiff(value, example.en) : [];
  const expectedWords = example.en.split(/\s+/).filter(Boolean);

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
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "生成失败");
        return;
      }
      // 换新句:覆盖当前卡例句并重置作答状态
      setAiOverride((m) => ({ ...m, [idx]: { en: data.en, zh: data.zh } }));
      setValue("");
      setChecked(false);
      setCorrect(false);
      setRevealed(0);
      setShowSkeleton(false);
      setUsedHint(false);
      toast.success("已换一句");
    } catch (err) {
      toast.error("生成失败：" + (err as Error).message);
    } finally {
      setAiLoading(false);
    }
  }
  // 逐词揭示：点一次多露一个词
  function revealNext() {
    setUsedHint(true);
    setRevealed((r) => Math.min(r + 1, expectedWords.length));
  }
  function check() {
    if (checked || pending) return;
    const ok = normSentence(value) === normSentence(example.en);
    setCorrect(ok);
    setChecked(true);
    // 连击：用过提示不计连击加成，但答对仍算对
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
    // 用过提示的正确答案降级为"勉强"(grade 1)，纯对给 2，错给 0
    const grade: Grade = correct ? (usedHint ? 1 : 2) : 0;
    if (!correct) setWrongItems((w) => (w.some((x) => x.word.id === item.word.id) ? w : [...w, item]));
    start(async () => {
      try {
        const res = await reviewWord({ wordId: item.word.id, grade });
        if (!res.ok) { toast.error(res.error); return; }
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
    // Enter 检查/下一题；Shift+Enter 换行
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!checked) check();
      else nextCard();
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>{idx + 1} / {queue.length} · 剩余 {queue.length - idx - 1}</span>
          {streak >= 2 && (
            <span className="inline-flex items-center gap-0.5 rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-600 dark:bg-orange-900/30">
              <Flame className="h-3 w-3" /> {streak} 连击
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {item.isNew && (
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30">新词</span>
          )}
          {aiEnabled && (
            <>
              <button
                type="button"
                onClick={() => setEasyMode((v) => !v)}
                className="inline-flex items-center gap-1 rounded border border-border/60 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                title="换 AI 句时的难度：简单更口语更短"
              >
                {easyMode ? "简单" : "标准"}
              </button>
              <button
                type="button"
                onClick={genAiSentence}
                disabled={aiLoading}
                className="inline-flex items-center gap-1 rounded border border-border/60 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
                title="用 AI 换一句新例句"
              >
                <Sparkles className="h-3 w-3" />
                {aiLoading ? "生成中…" : "换 AI 句"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setListenOnly((v) => !v)}
            className="inline-flex items-center gap-1 rounded border border-border/60 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
            title="切换提示方式"
          >
            {listenOnly ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {listenOnly ? "纯听写" : "看中文"}
          </button>
        </div>
      </div>

      <Progress value={progress} />

      <Card>
        <CardContent className="space-y-5 p-8">
          {/* 提示区：看中文 → 显示中文；纯听写 → 只给喇叭 */}
          <div className="space-y-3 text-center">
            <button
              onClick={playAudio}
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
              title="朗读整句"
            >
              <Volume2 className="h-5 w-5" />
            </button>
            {!listenOnly ? (
              <p className="text-lg font-medium">{example.zh}</p>
            ) : (
              <p className="text-sm text-muted-foreground">点喇叭听整句，然后默写英文</p>
            )}
          </div>

          {/* 输入：整句用多行文本框 */}
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            disabled={checked || pending}
            rows={3}
            placeholder={PLACEHOLDER}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className={
              "w-full resize-none rounded-md border bg-background p-3 text-base leading-relaxed outline-none transition-colors focus:ring-2 focus:ring-ring " +
              (checked ? (correct ? "border-success" : "border-destructive") : "")
            }
          />

          {/* 提示台阶：卡住时逐词揭示 / 首字母骨架 */}
          {!checked && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={revealNext}
                  disabled={revealed >= expectedWords.length}
                  className="inline-flex items-center gap-1 rounded border border-border/60 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  title="逐个揭示下一个词"
                >
                  <Lightbulb className="h-3 w-3" /> 提示下一词
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSkeleton((v) => !v); setUsedHint(true); }}
                  className="inline-flex items-center gap-1 rounded border border-border/60 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                  title="显示每个词的首字母骨架"
                >
                  {showSkeleton ? "隐藏骨架" : "看首字母"}
                </button>
                {revealed > 0 && (
                  <span className="text-xs text-muted-foreground">已揭示 {revealed}/{expectedWords.length}</span>
                )}
              </div>
              {(revealed > 0 || showSkeleton) && (
                <p className="flex flex-wrap gap-x-2 gap-y-1 rounded-md bg-amber-50 p-2 font-mono text-sm dark:bg-amber-900/15">
                  {expectedWords.map((w, i) => {
                    if (i < revealed) return <span key={i} className="text-foreground">{w}</span>;
                    if (showSkeleton) {
                      const skel = w[0] + "_".repeat(Math.max(0, w.length - 1));
                      return <span key={i} className="text-muted-foreground">{skel}</span>;
                    }
                    return <span key={i} className="text-muted-foreground/40">•••</span>;
                  })}
                </p>
              )}
            </div>
          )}

          {/* 判分后：逐词 diff + 正确答案 */}
          {checked && (
            <div className="space-y-3">
              <div className={"flex items-center gap-2 text-sm font-medium " + (correct ? "text-success" : "text-destructive")}>
                {correct ? "完全正确 🎉" : "有出入，看下面对照"}
              </div>
              {!correct && (
                <div className="rounded-md bg-muted/50 p-3 text-sm leading-relaxed">
                  <div className="mb-1 text-xs text-muted-foreground">正确答案（红=你漏/错的词）：</div>
                  <p className="flex flex-wrap gap-x-1.5 gap-y-1">
                    {diff.map((d, i) => (
                      <span key={i} className={d.ok ? "text-foreground" : "rounded bg-destructive/15 px-1 font-medium text-destructive"}>
                        {d.word}
                      </span>
                    ))}
                  </p>
                  <p className="mt-2 italic text-muted-foreground">{example.en}</p>
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            {!checked ? (
              <Button onClick={check} disabled={!value.trim() || pending}>
                检查 <CornerDownLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={nextCard} disabled={pending}>
                {idx + 1 >= queue.length ? "完成" : "下一句"} <CornerDownLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
