import type { ReactNode } from "react";
import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "orange" | "danger";

const TONE_CLASS: Record<Tone, string> = {
  default: "",
  success: "text-primary",
  orange: "text-orange-500",
  danger: "text-destructive",
};

export type SummaryStat = { value: number | string; label: string; tone?: Tone };

// 词汇三种学习模式(翻卡/单词拼写/句子拼写)共用的完成页外壳：
// 绿框 + 火苗 + 标题 + 统计三联；按钮组由各模式经 children 传入(差异大不强行统一)。
export function SessionSummary({
  title,
  stats,
  children,
}: {
  title: string;
  stats: SummaryStat[];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className={cn("bg-card/95", "border-border/60")}>
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Flame className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <div className="flex justify-center gap-6 text-center">
            {stats.map((s, i) => (
              <div key={i}>
                <div className={"text-2xl font-bold tabular-nums " + TONE_CLASS[s.tone ?? "default"]}>
                  {s.value}
                </div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">{children}</div>
        </CardContent>
      </Card>
    </div>
  );
}
