"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitSpeakingSession, type SessionTurn } from "@/lib/speaking/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Send, SkipForward, Volume2, ChevronRight, Timer, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Prompt = {
  id: string;
  part: 1 | 2 | 3;
  topic: string;
  question: string;
  followUps: string[] | null;
};

export function SpeakingSessionRunner({
  prompts,
  aiReady,
  voiceReady = false,
}: {
  prompts: Prompt[];
  aiReady: boolean;
  voiceReady?: boolean;
}) {
  const part = prompts[0].part;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [speaking, setSpeaking] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  // P2 独白：准备 60s → 讲话 120s
  const [p2Phase, setP2Phase] = useState<"prepare" | "speak" | "done">("prepare");
  const [p2Left, setP2Left] = useState(60);

  useEffect(() => {
    if (part !== 2 || p2Phase === "done") return;
    const total = p2Phase === "prepare" ? 60 : 120;
    setP2Left(total);
    const t = setInterval(() => {
      setP2Left((l) => {
        if (l <= 1) {
          if (p2Phase === "prepare") {
            setP2Phase("speak");
            return 120;
          }
          setP2Phase("done");
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [part, p2Phase]);

  function browserTTS(text: string) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  // 优先真人级 TTS(/api/tts)，未配置或失败时降级浏览器合成音
  async function speakQuestion(text: string) {
    // 停掉上一段
    ttsAudioRef.current?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    if (!voiceReady) {
      browserTTS(text);
      return;
    }
    setSpeaking(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(20_000), // 超时即降级浏览器合成音，不干等
      });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
      audio.addEventListener("play", () => setSpeaking(false), { once: true });
      await audio.play();
    } catch {
      setSpeaking(false);
      browserTTS(text); // 兜底
    }
  }

  useEffect(() => {
    return () => {
      ttsAudioRef.current?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function submit(skipped: boolean = false) {
    start(async () => {
      try {
        const transcript: SessionTurn[] = [];
        let ts = Date.now();
        for (const p of prompts) {
          transcript.push({ role: "examiner", text: p.question, ts: ts++ });
          const ans = answers[p.id]?.trim();
          if (ans) transcript.push({ role: "candidate", text: ans, ts: ts++ });
        }
        await submitSpeakingSession({
          part: part,
          promptIds: prompts.map((p) => p.id),
          transcript,
          skipped,
        });
      } catch (err) {
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast.error("提交失败：" + (err as Error).message);
      }
    });
  }

  const current = prompts[step];
  const isLast = step === prompts.length - 1;
  const answeredCount = Object.values(answers).filter((v) => v.trim()).length;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Part {part} 口语训练</h1>
          <p className="text-sm text-muted-foreground">
            {part === 1 && "个人话题 · 简短回答"}
            {part === 2 && "Cue Card · 独白 1-2 分钟"}
            {part === 3 && "深入讨论 · 展开论述"}
            {" · "}
            题 {step + 1} / {prompts.length} · 已答 {answeredCount}
          </p>
        </div>
      </div>

      {!aiReady && (
        <div className="rounded-md border border-yellow-500 bg-yellow-50 p-3 text-sm dark:bg-yellow-900/20">
          ⚠️ 未配置 <code>OPENAI_API_KEY</code>，AI 评分暂用占位分（5.5）。文本训练依然可用。
        </div>
      )}

      {part === 2 && p2Phase !== "done" && (
        <Card className={cn("border-2", p2Phase === "prepare" ? "border-yellow-500" : "border-green-500")}>
          <CardContent className="flex items-center gap-3 p-4">
            <Timer className={cn("h-8 w-8", p2Phase === "prepare" ? "text-yellow-500" : "text-green-500")} />
            <div className="flex-1">
              <div className="font-semibold">
                {p2Phase === "prepare" ? "准备时间" : "发言时间"}
              </div>
              <div className="text-sm text-muted-foreground">
                {p2Phase === "prepare" ? "打腹稿、列关键词，不用出声" : "看着 cue card 独白 1-2 分钟"}
              </div>
            </div>
            <div className="font-mono text-3xl font-bold">
              {String(Math.floor(p2Left / 60)).padStart(2, "0")}:
              {String(p2Left % 60).padStart(2, "0")}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardDescription className="uppercase tracking-wide">
                {current.topic}
              </CardDescription>
              <CardTitle className="mt-1 whitespace-pre-wrap text-base font-normal leading-relaxed">
                {current.question}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => speakQuestion(current.question)}
              disabled={speaking}
              title="朗读题目"
            >
              {speaking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={answers[current.id] ?? ""}
            onChange={(e) => setAnswers({ ...answers, [current.id]: e.target.value })}
            rows={part === 2 ? 8 : 4}
            placeholder={part === 2 ? "Speak (or type) your monologue in English..." : "Answer in English..."}
            lang="en"
          />
          {current.followUps && current.followUps.length > 0 && step === prompts.length - 1 && part === 1 && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <div className="mb-1 text-xs font-medium text-muted-foreground">后续问题（可加入回答里）：</div>
              <ul className="ml-4 list-disc space-y-1">
                {current.followUps.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => submit(true)} disabled={pending}>
          <SkipForward className="h-4 w-4" /> 跳过整节
        </Button>
        {isLast ? (
          <Button onClick={() => submit(false)} disabled={pending || answeredCount === 0} size="lg">
            <Send className="h-4 w-4" />
            {pending ? (aiReady ? "AI 评分中..." : "提交中...") : "提交并评分"}
          </Button>
        ) : (
          <Button onClick={() => setStep(step + 1)} size="lg">
            下一题
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
