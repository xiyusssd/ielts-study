"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Phone, PhoneOff, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Turn = { role: "examiner" | "candidate"; text: string; ts: number };

/**
 * OpenAI Realtime API WebRTC 客户端。
 * 流程：POST /api/speaking/session 拿 ephemeral token → 创建 RTCPeerConnection →
 * SDP offer 发送到 OpenAI /v1/realtime → answer 回来建立音频流。
 * 通过 data channel 交换 events（transcript 等）。
 */
export function RealtimeClient({
  part,
  onFinish,
}: {
  part: 1 | 2 | 3;
  onFinish: (transcript: Turn[]) => void;
}) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error" | "ended">("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    setStatus("connecting");
    setError(null);
    try {
      const res = await fetch("/api/speaking/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) throw new Error(await res.text());
      const token = await res.json() as { clientSecret: string; model: string };

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (e) => {
        if (audioRef.current) {
          audioRef.current.srcObject = e.streams[0];
        }
      };

      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = media;
      media.getTracks().forEach((track) => pc.addTrack(track, media));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onopen = () => {
        setStatus("connected");
      };
      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          handleEvent(event);
        } catch {}
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(token.model)}`,
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${token.clientSecret}`,
            "Content-Type": "application/sdp",
          },
          signal: AbortSignal.timeout(30_000),
        },
      );
      if (!sdpRes.ok) throw new Error("Realtime SDP 交换失败：" + (await sdpRes.text()));
      const answer = { type: "answer" as const, sdp: await sdpRes.text() };
      await pc.setRemoteDescription(answer);
    } catch (err) {
      const msg =
        (err as Error).name === "TimeoutError"
          ? "连接超时，请检查网络后重试"
          : (err as Error).message;
      setStatus("error");
      setError(msg);
      toast.error("连接失败：" + msg);
    }
  }

  function handleEvent(event: { type: string; transcript?: string; text?: string; role?: string }) {
    // 简化处理常见事件类型
    if (event.type === "response.audio_transcript.done" && event.transcript) {
      setTranscript((t) => [...t, { role: "examiner", text: event.transcript!, ts: Date.now() }]);
    } else if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
      setTranscript((t) => [...t, { role: "candidate", text: event.transcript!, ts: Date.now() }]);
    }
  }

  function toggleMute() {
    const s = streamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted(!muted);
  }

  function stop() {
    dcRef.current?.close();
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStatus("ended");
    onFinish(transcript);
  }

  useEffect(() => {
    return () => {
      dcRef.current?.close();
      pcRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Realtime 语音对话（实验版）</CardTitle>
        <CardDescription>
          直接和 AI 考官语音对话，结束后自动评分。需要开启麦克风权限。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <audio ref={audioRef} autoPlay playsInline className="hidden" />

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          {status === "idle" && (
            <Button onClick={start} size="lg">
              <Phone className="h-4 w-4" />
              开始通话
            </Button>
          )}
          {status === "connecting" && (
            <Button disabled size="lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              连接中...
            </Button>
          )}
          {status === "connected" && (
            <>
              <Button onClick={toggleMute} variant="outline" size="lg">
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {muted ? "取消静音" : "静音"}
              </Button>
              <Button onClick={stop} variant="destructive" size="lg">
                <PhoneOff className="h-4 w-4" />
                结束通话
              </Button>
            </>
          )}
          {status === "ended" && (
            <div className="text-sm text-muted-foreground">通话已结束，正在生成评分...</div>
          )}
          {status === "error" && (
            <Button onClick={start} variant="outline">
              重试
            </Button>
          )}
        </div>

        {status === "connected" && (
          <div className={cn("mx-auto h-2 w-2 animate-pulse rounded-full bg-green-500")} />
        )}

        {transcript.length > 0 && (
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-md bg-muted/50 p-3 text-sm">
            {transcript.map((t, i) => (
              <div key={i}>
                <span className={cn("mr-2 rounded px-1.5 py-0.5 text-xs font-mono", t.role === "examiner" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30" : "bg-green-100 text-green-700 dark:bg-green-900/30")}>
                  {t.role === "examiner" ? "考官" : "你"}
                </span>
                {t.text}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
