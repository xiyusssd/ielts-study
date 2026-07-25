"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitSpeaking } from "@/lib/assessment/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Countdown } from "@/components/assessment/countdown";
import { SkipForward, Send } from "lucide-react";

type Question = { id: string; question: string };

export function SpeakingTest({ questions, aiReady }: { questions: Question[]; aiReady: boolean }) {
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  function skip() {
    start(async () => {
      try {
        await submitSpeaking({ transcript: "", skipped: true });
      } catch (err) {
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast.error("提交失败：" + (err as Error).message);
      }
    });
  }

  function submit() {
    const combined = questions
      .map((q) => {
        const t = (transcripts[q.id] ?? "").trim();
        if (!t) return null;
        return `Q: ${q.question}\nA: ${t}`;
      })
      .filter(Boolean)
      .join("\n\n");
    if (!combined) {
      toast.warning("请至少回答一题，或点击跳过");
      return;
    }
    start(async () => {
      try {
        await submitSpeaking({ transcript: combined });
      } catch (err) {
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast.error("提交失败：" + (err as Error).message);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">口语测试</h1>
          <p className="text-sm text-muted-foreground">3 个 P1 问题 · 5 分钟</p>
        </div>
        <Countdown minutes={5} onExpire={submit} />
      </div>

      <Card className="border-blue-500 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4 text-sm space-y-2">
          <p>
            📢 <strong>P0 阶段临时方案</strong>：真实的 Realtime API 语音对话（P6 阶段完成）。
            现在你可以：
          </p>
          <ul className="ml-6 list-disc space-y-1 text-muted-foreground">
            <li>用键盘打字模拟英语作答（AI 会根据文字评分）</li>
            <li>或点击"跳过"，规划中使用默认起点 5.5</li>
          </ul>
        </CardContent>
      </Card>

      {!aiReady && !questions.length && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-4 text-sm">
            ⚠️ 未配置 API Key，将使用默认分数。
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {questions.map((q, i) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-base">
                <span className="mr-2 text-muted-foreground">Q{i + 1}.</span>
                {q.question}
              </CardTitle>
              <CardDescription>用英语作答，可以短一点</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={transcripts[q.id] ?? ""}
                onChange={(e) => setTranscripts({ ...transcripts, [q.id]: e.target.value })}
                rows={4}
                placeholder="Type your answer in English..."
                lang="en"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={skip} disabled={pending}>
          <SkipForward className="h-4 w-4" />
          跳过口语测试
        </Button>
        <Button onClick={submit} disabled={pending} size="lg">
          <Send className="h-4 w-4" />
          {pending ? "评分中..." : "提交并查看报告"}
        </Button>
      </div>
    </div>
  );
}
