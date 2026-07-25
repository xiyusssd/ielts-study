"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createOrUpdatePlan } from "@/lib/planner/actions";
import type { Bands } from "@/lib/scoring/band-mapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Defaults = {
  targetOverall: number;
  targetListening: number;
  targetReading: number;
  targetWriting: number;
  targetSpeaking: number;
  examDate: string;
  weeklyHours: number;
};

const BANDS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

export function PlanSetupForm({ current, defaults }: { current: Bands; defaults: Defaults }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(fd: FormData) {
    setError(null);
    start(async () => {
      const res = await createOrUpdatePlan(fd);
      if (res && "ok" in res && !res.ok) {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <form action={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>目标分数</CardTitle>
          <CardDescription>参考当前水平设置合理目标（建议单项跨度 ≤ 2.0 band）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TargetRow label="总分 (Overall)" name="targetOverall" defaultValue={defaults.targetOverall} currentValue={current.vocab} hideCurrent />
          <TargetRow label="听力 (Listening)" name="targetListening" defaultValue={defaults.targetListening} currentValue={current.listening} />
          <TargetRow label="阅读 (Reading)" name="targetReading" defaultValue={defaults.targetReading} currentValue={current.reading} />
          <TargetRow label="写作 (Writing)" name="targetWriting" defaultValue={defaults.targetWriting} currentValue={current.writing} />
          <TargetRow label="口语 (Speaking)" name="targetSpeaking" defaultValue={defaults.targetSpeaking} currentValue={current.speaking} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>时间安排</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="examDate">考试日期</Label>
            <Input id="examDate" name="examDate" type="date" defaultValue={defaults.examDate} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weeklyHours">每周投入 (小时)</Label>
            <Input id="weeklyHours" name="weeklyHours" type="number" min={1} max={60} defaultValue={defaults.weeklyHours} required />
          </div>
        </CardContent>
      </Card>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "生成中..." : "生成学习计划"}
        </Button>
      </div>
    </form>
  );
}

function TargetRow({
  label,
  name,
  defaultValue,
  currentValue,
  hideCurrent,
}: {
  label: string;
  name: string;
  defaultValue: number;
  currentValue: number;
  hideCurrent?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Label className="w-40 shrink-0">{label}</Label>
      <select
        name={name}
        defaultValue={String(defaultValue)}
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {BANDS.map((b) => (
          <option key={b} value={b}>
            {b.toFixed(1)}
          </option>
        ))}
      </select>
      {!hideCurrent && (
        <span className="text-xs text-muted-foreground">
          当前：<span className="font-mono">{currentValue || "—"}</span>
        </span>
      )}
    </div>
  );
}
