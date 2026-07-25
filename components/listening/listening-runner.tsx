"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AudioPlayer } from "@/components/listening/audio-player";
import { QuestionRenderer, type RenderedQ } from "@/components/reading/question-renderer";
import { submitListeningAttempt } from "@/lib/listening/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Countdown } from "@/components/assessment/countdown";
import { Ear, Eye, EyeOff } from "lucide-react";

export function ListeningRunner({
  passageId,
  title,
  transcript,
  audioUrl,
  questions,
  minutes = 30,
}: {
  passageId: string;
  title: string;
  transcript: string;
  audioUrl: string | null;
  questions: RenderedQ[];
  minutes?: number;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [pending, start] = useTransition();
  const startedAt = useState(Date.now())[0];

  function submit() {
    start(async () => {
      try {
        const duration = Math.round((Date.now() - startedAt) / 1000);
        await submitListeningAttempt({ passageId, answers, duration });
      } catch (err) {
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast.error("提交失败：" + (err as Error).message);
      }
    });
  }

  const answered = Object.values(answers).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {questions.length} 题 · 已答 {answered} · {minutes} 分钟
          </p>
        </div>
        <div className="flex gap-2">
          <Countdown minutes={minutes} onExpire={submit} />
        </div>
      </div>

      <AudioPlayer audioUrl={audioUrl} fallbackScript={transcript} />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/listening/${passageId}/dictation`}>
            <Ear className="h-4 w-4" />
            改用精听模式
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowTranscript(!showTranscript)}>
          {showTranscript ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showTranscript ? "隐藏原文" : "显示原文（做完题后再看）"}
        </Button>
      </div>

      {showTranscript && (
        <Card>
          <CardContent className="p-4">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">{transcript}</pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          {questions.map((q) => (
            <QuestionRenderer
              key={q.id}
              q={q}
              value={answers[q.id] ?? ""}
              onChange={(v) => setAnswers({ ...answers, [q.id]: v })}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending} size="lg">
          {pending ? "判分中..." : "提交答卷"}
        </Button>
      </div>
    </div>
  );
}
