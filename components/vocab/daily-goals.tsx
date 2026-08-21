"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveDailyGoals } from "@/lib/vocab/actions";
import {
  MIN_DAILY_NEW,
  MAX_DAILY_NEW,
  NEW_WORDS_STEP,
  REVIEW_RATIOS,
  dailyReviewOf,
  type ReviewRatio,
} from "@/lib/vocab/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";

const SLIDER_TICKS: number[] = [];
for (let n = MIN_DAILY_NEW; n <= MAX_DAILY_NEW; n += NEW_WORDS_STEP) SLIDER_TICKS.push(n);

export function DailyGoals({ newWords, ratio }: { newWords: number; ratio: ReviewRatio }) {
  const [nw, setNw] = useState(newWords);
  const [rt, setRt] = useState<ReviewRatio>(ratio);
  const [pending, start] = useTransition();
  const review = dailyReviewOf(nw, rt);
  const dirty = nw !== newWords || rt !== ratio;

  function save() {
    start(async () => {
      const res = await saveDailyGoals({ newWords: nw, ratio: rt });
      if (res.ok) toast.success(`每日目标已更新：新词 ${nw} · 复习 ${review}`);
      else toast.error(res.error);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          每日词量
        </CardTitle>
        <CardDescription>拖动滑块设置每天新词数（30-100），复习量按配比自动配对。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 每日新词：50-100 滑块 */}
        <div>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium">每日新词</span>
            <span className="text-3xl font-bold text-primary tabular-nums">{nw}</span>
          </div>
          <input
            type="range"
            min={MIN_DAILY_NEW}
            max={MAX_DAILY_NEW}
            step={NEW_WORDS_STEP}
            value={nw}
            onChange={(e) => setNw(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            aria-label="每日新词数"
          />
          <div className="mt-1 flex justify-between px-0.5 text-xs text-muted-foreground">
            {SLIDER_TICKS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setNw(t)}
                className={
                  "rounded px-1 py-0.5 transition-colors hover:text-foreground " +
                  (nw === t ? "font-semibold text-primary" : "")
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 复习配比：1:2 / 1:3 */}
        <div>
          <div className="mb-2 text-sm font-medium">复习 : 新词 配比</div>
          <div className="flex gap-2">
            {REVIEW_RATIOS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRt(r)}
                aria-pressed={rt === r}
                className={
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all " +
                  (rt === r
                    ? "border-primary bg-primary/10 text-primary shadow-soft"
                    : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground")
                }
              >
                1 : {r}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            每学 1 个新词搭配 {rt} 个复习词 → 每日共约{" "}
            <span className="font-semibold text-foreground">{nw + review}</span> 词
          </p>
        </div>

        {/* 实时配对结果 */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary tabular-nums">{nw}</div>
            <div className="text-xs text-muted-foreground">新词</div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">{review}</div>
            <div className="text-xs text-muted-foreground">复习（1:{rt}）</div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty || pending} size="sm">
            {pending ? "保存中..." : "保存"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}