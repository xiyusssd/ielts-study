"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveDailyGoals } from "@/lib/vocab/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";

const NEW_PRESETS = [5, 10, 15, 20, 30, 50];
const REVIEW_PRESETS = [50, 100, 150, 200, 300];

export function DailyGoals({
  newWords,
  reviewWords,
}: {
  newWords: number;
  reviewWords: number;
}) {
  const [nw, setNw] = useState(newWords);
  const [rw, setRw] = useState(reviewWords);
  const [pending, start] = useTransition();
  const dirty = nw !== newWords || rw !== reviewWords;

  function save() {
    start(async () => {
      const res = await saveDailyGoals({ newWords: nw, reviewWords: rw });
      if (res.ok) toast.success("每日目标已更新");
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
        <CardDescription>自定义每天学多少新词、复习多少词。改动立即生效。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium">每日新词</span>
            <span className="text-2xl font-bold text-primary tabular-nums">{nw}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {NEW_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNw(n)}
                className={
                  "min-w-[3rem] rounded-md border px-2 py-1 text-sm font-mono transition-colors hover:bg-muted " +
                  (nw === n ? "border-primary bg-primary/10 font-semibold text-primary" : "")
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium">每日复习上限</span>
            <span className="text-2xl font-bold text-primary tabular-nums">{rw}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REVIEW_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRw(n)}
                className={
                  "min-w-[3rem] rounded-md border px-2 py-1 text-sm font-mono transition-colors hover:bg-muted " +
                  (rw === n ? "border-primary bg-primary/10 font-semibold text-primary" : "")
                }
              >
                {n}
              </button>
            ))}
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
