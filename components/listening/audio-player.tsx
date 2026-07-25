"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, Rewind, FastForward, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

const SPEEDS = [0.75, 1, 1.25, 1.5];

/**
 * 通用听力播放器。
 * - 有 audioUrl (MP3)：用 <audio> 元素
 * - 无 audioUrl：用浏览器 SpeechSynthesis 朗读 script 字符串
 */
export function AudioPlayer({
  audioUrl,
  fallbackScript,
  autoPlay = false,
}: {
  audioUrl?: string | null;
  fallbackScript?: string;
  autoPlay?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [source, setSource] = useState<"audio" | "tts">(audioUrl ? "audio" : "tts");

  // audio element mode
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;
    const el = audioRef.current;
    el.playbackRate = speed;
    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onEnd = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    if (autoPlay) el.play().then(() => setPlaying(true)).catch(() => {});
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, [audioUrl, autoPlay, speed]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
    if (source === "tts" && typeof window !== "undefined" && "speechSynthesis" in window) {
      // TTS 不支持精确控速，只能重新触发
    }
  }, [speed, source]);

  function toggle() {
    if (source === "audio" && audioRef.current) {
      if (playing) audioRef.current.pause();
      else audioRef.current.play();
      setPlaying(!playing);
    } else if (fallbackScript) {
      if (playing) {
        window.speechSynthesis?.cancel();
        setPlaying(false);
      } else {
        const u = new SpeechSynthesisUtterance(fallbackScript);
        u.lang = "en-US";
        u.rate = speed;
        u.onend = () => setPlaying(false);
        u.onerror = () => setPlaying(false);
        window.speechSynthesis?.speak(u);
        setPlaying(true);
      }
    }
  }

  function seek(delta: number) {
    if (source === "audio" && audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
    }
  }

  function seekTo(pct: number) {
    if (source === "audio" && audioRef.current && duration) {
      audioRef.current.currentTime = pct * duration;
    }
  }

  function stopTTS() {
    if (source === "tts") {
      window.speechSynthesis?.cancel();
      setPlaying(false);
    }
  }

  const progressPct = duration ? (current / duration) * 100 : 0;

  return (
    <div className="rounded-lg border bg-card p-4">
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden">
          Your browser does not support the audio element.
        </audio>
      )}

      <div className="flex items-center gap-3">
        <Button size="icon" onClick={toggle} className="h-10 w-10 shrink-0 rounded-full">
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>

        {source === "audio" && (
          <>
            <Button variant="ghost" size="icon" onClick={() => seek(-10)} title="后退 10 秒">
              <Rewind className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => seek(10)} title="前进 10 秒">
              <FastForward className="h-4 w-4" />
            </Button>
          </>
        )}

        <div className="flex flex-1 items-center gap-2">
          {source === "audio" ? (
            <>
              <span className="min-w-[3rem] font-mono text-xs text-muted-foreground">
                {formatTime(current)}
              </span>
              <button
                className="flex h-2 flex-1 items-center rounded-full bg-secondary"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  seekTo((e.clientX - rect.left) / rect.width);
                }}
              >
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
              </button>
              <span className="min-w-[3rem] font-mono text-xs text-muted-foreground">
                {formatTime(duration)}
              </span>
            </>
          ) : (
            <div className="flex-1 text-sm text-muted-foreground">
              浏览器 TTS 播放中... {playing && <span className="text-primary">▶</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Gauge className="h-3 w-3 text-muted-foreground" />
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => {
                if (source === "tts" && playing) stopTTS();
                setSpeed(s);
              }}
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-xs",
                speed === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {source === "tts" && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Volume2 className="h-3 w-3" />
          使用浏览器 TTS · 想要更自然的音频？运行{" "}
          <code className="rounded bg-muted px-1">scripts/gen-listening-audio.ts</code>
        </div>
      )}
    </div>
  );
}

function formatTime(sec: number): string {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
