"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitWriting } from "@/lib/assessment/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Countdown } from "@/components/assessment/countdown";

export function WritingTest({
  prompt,
  minWords,
  minutes,
  aiReady,
}: {
  prompt: string;
  minWords: number;
  minutes: number;
  aiReady: boolean;
}) {
  const [content, setContent] = useState("");
  const [pending, start] = useTransition();
  const startTs = useRef(Date.now());

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  function submit() {
    if (!content.trim()) {
      toast.warning("请写点内容再提交");
      return;
    }
    start(async () => {
      try {
        const duration = Math.round((Date.now() - startTs.current) / 1000);
        await submitWriting({ content, wordCount, duration });
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
          <h1 className="text-2xl font-bold">写作测试</h1>
          <p className="text-sm text-muted-foreground">
            Task 2 简版 · 目标 {minWords} 词 · {minutes} 分钟
          </p>
        </div>
        <Countdown minutes={minutes} onExpire={submit} />
      </div>

      {!aiReady && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-4 text-sm">
            ⚠️ 未配置 <code>OPENAI_API_KEY</code>，本次将使用默认分（5.5）作为占位。前往{" "}
            <a href="/settings" className="text-primary underline">
              /settings
            </a>{" "}
            查看配置。
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>题目</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">{prompt}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">你的作文</CardTitle>
          <span className={"text-sm font-mono " + (wordCount < minWords ? "text-muted-foreground" : "text-green-600")}>
            {wordCount} / {minWords}+ 词
          </span>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            placeholder="开始写作..."
            className="font-serif leading-relaxed"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending} size="lg">
          {pending ? "提交并评分中..." : "提交作文"}
        </Button>
      </div>
    </div>
  );
}
