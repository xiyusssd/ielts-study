"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { pickStoryWords, generateStory } from "@/lib/vocab/story";
import type { WordStory } from "@/lib/vocab/format";
import { speakText } from "@/lib/audio/tts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, Volume2, RefreshCw, Shuffle } from "lucide-react";

type PickWord = { id: string; spelling: string };

const SOURCES = [
  { key: "mistakes", label: "错词" },
  { key: "favorites", label: "生词本" },
  { key: "recent", label: "最近学过" },
] as const;

export function StoryGenerator({ aiEnabled }: { aiEnabled: boolean }) {
  const [source, setSource] = useState<"mistakes" | "favorites" | "recent">("mistakes");
  const [count, setCount] = useState("5");
  const [words, setWords] = useState<PickWord[]>([]);
  const [story, setStory] = useState<WordStory | null>(null);
  const [loading, setLoading] = useState(false);
  const [, start] = useTransition();

  async function generate(newWords?: PickWord[]) {
    const pick = newWords ?? words;
    if (pick.length < 2) return;
    setLoading(true);
    try {
      const res = await generateStory({ words: pick.map((w) => w.spelling) });
      if (res.ok) setStory(res.story);
      else toast.error(res.error);
    } catch (e) {
      toast.error("生成失败：" + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function pickAndGenerate() {
    start(async () => {
      const res = await pickStoryWords({ source, count: Number.parseInt(count, 10) });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.words.length < 2) {
        toast.info("这个来源的词还不够（至少 2 个）");
        return;
      }
      setWords(res.words);
      setStory(null);
      await generate(res.words);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            选择词汇来源
          </CardTitle>
          <CardDescription>AI 会把选中的词自然融入一个 80-120 词的英文小故事。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={source} onValueChange={(v) => setSource(v as typeof source)} className="flex flex-wrap gap-4">
            {SOURCES.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <RadioGroupItem value={s.key} id={`src-${s.key}`} />
                <Label htmlFor={`src-${s.key}`}>{s.label}</Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Label>词数</Label>
              <select
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="rounded-md border border-border/60 bg-card px-2 py-1 text-sm"
              >
                {[3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} 词
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={pickAndGenerate} disabled={loading || !aiEnabled}>
              {loading ? (
                "生成中..."
              ) : (
                <>
                  <Shuffle className="h-4 w-4" />
                  抽词并生成故事
                </>
              )}
            </Button>
            {!aiEnabled && (
              <span className="text-xs text-muted-foreground">AI 文本能力未配置（.env 缺少 Key）</span>
            )}
          </div>

          {words.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">本组词汇：</span>
              {words.map((w) => (
                <Link key={w.id} href={`/vocab/${w.id}`}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/70">
                    {w.spelling}
                  </Badge>
                </Link>
              ))}
              <Button variant="ghost" size="sm" onClick={pickAndGenerate} disabled={loading}>
                <RefreshCw className="h-3.5 w-3.5" />
                换一批词
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {story && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              小故事
              <Button variant="ghost" size="sm" onClick={() => speakText(story.en, { rate: 0.9 })} title="朗读故事">
                <Volume2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => generate()} disabled={loading} title="用同一组词换一个故事">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base leading-relaxed">{highlightWords(story.en, words.map((w) => w.spelling))}</p>
            <p className="border-t border-border/50 pt-4 text-sm text-muted-foreground">{story.zh}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** 把故事里的目标词加粗高亮。 */
function highlightWords(en: string, words: string[]): React.ReactNode {
  const parts = en.split(/(\s+)/);
  const lower = new Set(words.map((w) => w.toLowerCase()));
  return parts.map((part, i) => {
    const clean = part.replace(/[^a-zA-Z']/g, "").toLowerCase();
    if (clean && lower.has(clean)) {
      return (
        <span key={i} className="font-bold text-primary">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}