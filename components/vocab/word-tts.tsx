"use client";

import { Volume2 } from "lucide-react";
import { playWord } from "@/lib/audio/play";

export function WordTTS({ text }: { text: string }) {
  return (
    <button
      onClick={() => playWord(text)}
      className="rounded-full p-1 text-muted-foreground hover:bg-muted"
      title="朗读"
    >
      <Volume2 className="h-4 w-4" />
    </button>
  );
}
