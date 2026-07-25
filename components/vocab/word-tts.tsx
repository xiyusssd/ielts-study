"use client";

import { Volume2 } from "lucide-react";

export function WordTTS({ text }: { text: string }) {
  function speak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
  return (
    <button
      onClick={speak}
      className="rounded-full p-1 text-muted-foreground hover:bg-muted"
      title="朗读"
    >
      <Volume2 className="h-4 w-4" />
    </button>
  );
}
