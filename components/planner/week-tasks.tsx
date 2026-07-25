"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleTask } from "@/lib/planner/actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, BookOpen, Headphones, Pen, Mic, Languages, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskItem = {
  id: string;
  module: string;
  date: string;
  completed: boolean;
  content: { type?: string; minutes?: number; description?: string };
};

const ICONS: Record<string, typeof BookOpen> = {
  vocab: Languages,
  reading: BookOpen,
  listening: Headphones,
  writing: Pen,
  speaking: Mic,
};

const HREF: Record<string, string> = {
  vocab: "/vocab",
  reading: "/reading",
  listening: "/listening",
  writing: "/writing",
  speaking: "/speaking",
};

export function WeekTasks({ tasks }: { tasks: TaskItem[] }) {
  const [items, setItems] = useState(tasks);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  const grouped = groupByDate(items);

  function toggle(t: TaskItem) {
    setPendingId(t.id);
    setItems(items.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)));
    start(async () => {
      await toggleTask(t.id, !t.completed);
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-4">
      {grouped.map(({ date, tasks: dayTasks }) => (
        <div key={date}>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span>{formatDate(date)}</span>
            {isToday(date) && (
              <span className="rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">今天</span>
            )}
          </div>
          <div className="space-y-2">
            {dayTasks.map((t) => {
              const Icon = ICONS[t.module] ?? BookOpen;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center gap-3 rounded-md border p-3 text-sm",
                    t.completed && "bg-muted/50 opacity-70",
                  )}
                >
                  <button onClick={() => toggle(t)} disabled={pendingId === t.id}>
                    {t.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                    )}
                  </button>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className={cn(t.completed && "line-through")}>{t.content.description}</div>
                    {t.content.minutes && (
                      <div className="text-xs text-muted-foreground">{t.content.minutes} 分钟</div>
                    )}
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={HREF[t.module] ?? "/"}>
                      开始
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function groupByDate(tasks: TaskItem[]): { date: string; tasks: TaskItem[] }[] {
  const map = new Map<string, TaskItem[]>();
  for (const t of tasks) {
    const key = t.date.split("T")[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, tasks]) => ({ date, tasks }));
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
}
