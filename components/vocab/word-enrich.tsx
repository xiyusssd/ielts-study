"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { enrichWord } from "@/lib/vocab/etymology";
import { generateWordStory } from "@/lib/vocab/story";
import type { Derivative, EtymologyPart, WordStory } from "@/lib/vocab/format";
import { speakText } from "@/lib/audio/tts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Volume2, Lightbulb, Network, BookOpen, Quote } from "lucide-react";

export type EnrichData = {
  defEn: string;
  etymology: EtymologyPart[];
  derivatives: Derivative[];
  mnemonic: string;
};

export function WordEnrich({
  wordId,
  aiEnabled,
  initial,
  initialStory,
}: {
  wordId: string;
  aiEnabled: boolean;
  initial: EnrichData | null;
  initialStory: WordStory | null;
}) {
  const [data, setData] = useState<EnrichData | null>(initial);
  const [story, setStory] = useState<WordStory | null>(initialStory);
  const [busy, setBusy] = useState<"enrich" | "story" | null>(null);

  async function runEnrich(force = false) {
    setBusy("enrich");
    try {
      const res = await enrichWord({ wordId, force });
      if (res.ok) setData(res.data);
      else toast.error(res.error);
    } catch (e) {
      toast.error("生成失败：" + (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runStory(force = false) {
    setBusy("story");
    try {
      const res = await generateWordStory({ wordId, force });
      if (res.ok) setStory(res.story);
      else toast.error(res.error);
    } catch (e) {
      toast.error("生成失败：" + (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const hasEnrich = !!(data?.defEn || data?.mnemonic);

  return (
    <div className="space-y-6">
      {/* AI 记忆包 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            AI 记忆包
          </h3>
          {hasEnrich && (
            <Button variant="ghost" size="sm" onClick={() => runEnrich(true)} disabled={busy !== null || !aiEnabled}>
              <RefreshCw className="h-3.5 w-3.5" />
              {busy === "enrich" ? "生成中..." : "重新生成"}
            </Button>
          )}
        </div>

        {hasEnrich ? (
          <div className="space-y-4">
            {data!.defEn && (
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" /> 英文释义
                </div>
                <p className="text-sm italic">{data!.defEn}</p>
              </div>
            )}

            {data!.etymology.length > 0 && (
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Network className="h-3.5 w-3.5" /> 词根词缀
                </div>
                <div className="flex flex-wrap gap-2">
                  {data!.etymology.map((e, i) => (
                    <Badge key={i} variant="outline" className="gap-1 text-xs">
                      <span className="font-bold text-primary">{e.part}</span>
                      {e.meaning}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {data!.derivatives.length > 0 && (
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" /> 派生词
                </div>
                <div className="flex flex-wrap gap-2">
                  {data!.derivatives.map((d, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {d.word}
                      <span className="ml-1 font-mono text-[10px] text-muted-foreground">{d.pos}</span>
                      <span className="ml-1 text-muted-foreground">{d.meaning}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {data!.mnemonic && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5" /> 助记
                </div>
                <p className="text-sm">{data!.mnemonic}</p>
              </div>
            )}
          </div>
        ) : aiEnabled ? (
          <Button onClick={() => runEnrich(false)} disabled={busy !== null} variant="outline">
            <Sparkles className="h-4 w-4" />
            {busy === "enrich" ? "生成中..." : "AI 生成记忆包（英文释义/词根/派生词/助记）"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">AI 文本能力未配置（.env 缺少 Key）</p>
        )}
      </section>

      {/* 单词小故事 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Quote className="h-4 w-4 text-primary" />
            单词小故事
          </h3>
          {story && (
            <Button variant="ghost" size="sm" onClick={() => runStory(true)} disabled={busy !== null || !aiEnabled}>
              <RefreshCw className="h-3.5 w-3.5" />
              {busy === "story" ? "生成中..." : "换一个"}
            </Button>
          )}
        </div>

        {story ? (
          <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => speakText(story.en, { rate: 0.9 })}>
                <Volume2 className="h-4 w-4" /> 朗读
              </Button>
            </div>
            <p className="text-sm leading-relaxed">{story.en}</p>
            <p className="border-t border-border/50 pt-3 text-sm text-muted-foreground">{story.zh}</p>
          </div>
        ) : aiEnabled ? (
          <Button onClick={() => runStory(false)} disabled={busy !== null} variant="outline">
            <Quote className="h-4 w-4" />
            {busy === "story" ? "生成中..." : "AI 生成单词小故事"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">AI 文本能力未配置（.env 缺少 Key）</p>
        )}
      </section>

      {/* 更多入口 */}
      <section>
        <Link href="/vocab/story" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
          想把这组词放进更长的小故事？去 AI 小故事页 →
        </Link>
      </section>
    </div>
  );
}