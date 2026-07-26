"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitManualBands } from "@/lib/assessment/actions";
import { SECTIONS, SECTION_META, type SectionName } from "@/lib/assessment/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// 雅思 band：0-9，0.5 步进
const BAND_OPTIONS = Array.from({ length: 19 }, (_, i) => i * 0.5);

export function ManualBandsForm() {
  const [bands, setBands] = useState<Record<SectionName, number>>({
    vocab: 6,
    listening: 6,
    reading: 6,
    writing: 6,
    speaking: 6,
  });
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      try {
        await submitManualBands(bands);
      } catch (err) {
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast.error("保存失败：" + (err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {SECTIONS.map((s) => (
        <Card key={s}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{SECTION_META[s].label}</span>
              <span className="text-2xl font-bold text-primary tabular-nums">
                {bands[s].toFixed(1)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BAND_OPTIONS.map((b) => {
                const picked = bands[s] === b;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBands({ ...bands, [s]: b })}
                    className={
                      "min-w-[2.75rem] rounded-md border px-2 py-1 text-sm font-mono transition-colors hover:bg-muted " +
                      (picked ? "border-primary bg-primary/10 font-semibold text-primary" : "")
                    }
                  >
                    {b.toFixed(1)}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending} size="lg">
          {pending ? "保存中..." : "保存分数 · 查看报告"}
        </Button>
      </div>
    </div>
  );
}
