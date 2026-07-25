"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitEssay } from "@/lib/writing/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Countdown } from "@/components/assessment/countdown";
import { cn } from "@/lib/utils";
import { Save, Send, AlertCircle } from "lucide-react";

export function EssayEditor({
  promptId,
  prompt,
  minWords,
  minutes,
  aiReady,
}: {
  promptId: string;
  prompt: string;
  minWords: number;
  minutes: number;
  aiReady: boolean;
}) {
  const storageKey = `essay-draft-${promptId}`;
  const [content, setContent] = useState("");
  const [pending, start] = useTransition();
  const startTs = useRef(Date.now());
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // 加载 localStorage 草稿
  useEffect(() => {
    const cached = localStorage.getItem(storageKey);
    if (cached) setContent(cached);
  }, [storageKey]);

  // 自动保存（debounce 1s）
  useEffect(() => {
    if (!content) return;
    const t = setTimeout(() => {
      localStorage.setItem(storageKey, content);
      setSavedAt(new Date());
    }, 1000);
    return () => clearTimeout(t);
  }, [content, storageKey]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const enoughWords = wordCount >= minWords;

  function submit() {
    if (!content.trim()) {
      toast.warning("请写点内容再提交");
      return;
    }
    if (!enoughWords) {
      const ok = confirm(`字数 ${wordCount} 未达到 ${minWords}。仍要提交？（会扣分）`);
      if (!ok) return;
    }
    start(async () => {
      try {
        const duration = Math.round((Date.now() - startTs.current) / 1000);
        await submitEssay({ promptId, content, wordCount, duration });
        localStorage.removeItem(storageKey);
      } catch (err) {
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast.error("提交失败：" + (err as Error).message);
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <Card className="lg:sticky lg:top-4 lg:self-start">
        <CardHeader>
          <CardTitle className="text-base">题目</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">{prompt}</pre>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-sm text-muted-foreground">字数</div>
              <div className={cn("font-mono text-2xl font-bold", enoughWords ? "text-green-600" : "text-orange-600")}>
                {wordCount}
                <span className="ml-1 text-xs font-normal text-muted-foreground">/ {minWords}+</span>
              </div>
            </div>
            {savedAt && (
              <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                <Save className="h-3 w-3" />
                自动保存 {savedAt.toLocaleTimeString("zh-CN")}
              </div>
            )}
          </div>
          <Countdown minutes={minutes} onExpire={submit} />
        </div>

        {!aiReady && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-500 bg-yellow-50 p-3 text-sm dark:bg-yellow-900/20">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
            <div>
              未配置 <code>OPENAI_API_KEY</code>。提交后会用占位分（5.5）。在 <a href="/settings" className="text-primary underline">/settings</a> 里配置后重启，即可获得 AI 4 维批改（TR/CC/LR/GRA）+ 逐段评语 + 错误修正。
            </div>
          </div>
        )}

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={22}
          placeholder="开始写作..."
          className="font-serif leading-relaxed"
        />

        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending} size="lg">
            <Send className="h-4 w-4" />
            {pending ? (aiReady ? "AI 批改中（30 秒以内）..." : "提交中...") : "提交并批改"}
          </Button>
        </div>
      </div>
    </div>
  );
}
