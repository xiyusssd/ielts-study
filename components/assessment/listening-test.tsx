"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { PoolQ } from "@/lib/assessment/pools/types";
import { submitListening } from "@/lib/assessment/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Countdown } from "@/components/assessment/countdown";
import { Play, Pause, Volume2 } from "lucide-react";

export function ListeningTest({
  poolId,
  title,
  script,
  questions,
}: {
  poolId: string;
  title: string;
  script: string;
  questions: PoolQ[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [hasAudioFile, setHasAudioFile] = useState(false);
  const [pending, start] = useTransition();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioSrc = `/audio/listening/${poolId}.m4a`;

  // 探测是否有预生成的清晰音频文件
  useEffect(() => {
    let alive = true;
    fetch(audioSrc, { method: "HEAD" })
      .then((r) => alive && setHasAudioFile(r.ok))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [audioSrc]);

  function play() {
    // 优先播放预生成的清晰音频；没有再退回浏览器 TTS
    if (hasAudioFile && audioRef.current) {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        audioRef.current.play();
        setPlaying(true);
      }
      return;
    }
    if ("speechSynthesis" in window) {
      if (playing) {
        window.speechSynthesis.cancel();
        setPlaying(false);
        return;
      }
      const utter = new SpeechSynthesisUtterance(script);
      utter.lang = "en-US";
      utter.rate = 0.95;
      utter.onend = () => setPlaying(false);
      utter.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(utter);
      setPlaying(true);
    } else {
      toast.error("浏览器不支持语音合成，请查看文本");
      setShowScript(true);
    }
  }

  function submit() {
    start(async () => {
      try {
        await submitListening({ poolId, answers });
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
          <h1 className="text-2xl font-bold">听力测试</h1>
          <p className="text-sm text-muted-foreground">1 段对话 · 6 道题 · 10 分钟</p>
        </div>
        <Countdown minutes={10} onExpire={submit} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="h-5 w-5" /> {title}
          </CardTitle>
          <CardDescription>
            {hasAudioFile ? "清晰音频，可反复听。" : "浏览器语音播报，可反复听。"}做完题再展开原文。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasAudioFile && (
            <audio
              ref={audioRef}
              src={audioSrc}
              preload="none"
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={play} variant={playing ? "destructive" : "default"}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "停止" : "播放"}
            </Button>
            <Button variant="outline" onClick={() => setShowScript(!showScript)}>
              {showScript ? "隐藏原文" : "显示原文（建议做完题后再看）"}
            </Button>
          </div>
          {showScript && (
            <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-relaxed">
              {script}
            </pre>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <Card key={q.id}>
            <CardContent className="space-y-3 p-4">
              <div className="font-medium">
                <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                {q.prompt}
              </div>
              {q.type === "mcq" ? (
                <div className="space-y-2">
                  {q.options?.map((opt, oi) => {
                    const letter = String.fromCharCode(65 + oi);
                    const picked = answers[q.id] === opt; // 按选项文本存
                    return (
                      <button
                        key={oi}
                        onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                        className={
                          "block w-full rounded-md border p-2 text-left text-sm hover:bg-muted " +
                          (picked ? "border-primary bg-primary/5" : "")
                        }
                      >
                        <span className="mr-2 font-mono text-muted-foreground">{letter}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Input
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="填写答案"
                  className="max-w-xs"
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending} size="lg">
          {pending ? "提交中..." : "提交并进入下一节"}
        </Button>
      </div>
    </div>
  );
}
