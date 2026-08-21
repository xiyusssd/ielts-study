import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { WordTTS } from "@/components/vocab/word-tts";
import { MistakeRowActions, MistakeClearButton } from "@/components/vocab/mistake-actions";
import { AlertTriangle, BookOpen, Headphones, Check } from "lucide-react";

export default async function MistakesPage() {
  const user = await requireUser();
  if (!user) return null;

  const [rows, stats] = await Promise.all([
    prisma.mistakeWord.findMany({
      where: { userId: user.id },
      orderBy: [{ mastered: "asc" }, { lastWrongAt: "desc" }],
      take: 200,
      include: { word: { select: { id: true, spelling: true, ipa: true, translations: true, freq: true } } },
    }),
    prisma.mistakeWord.groupBy({
      by: ["mastered"],
      where: { userId: user.id },
      _count: { _all: true },
    }),
  ]);

  const unmastered = stats.find((s) => !s.mastered)?._count._all ?? 0;
  const mastered = stats.find((s) => s.mastered)?._count._all ?? 0;

  function firstMeaning(raw: string): string {
    try {
      const v = JSON.parse(raw);
      if (Array.isArray(v) && v.length > 0) return `${v[0].pos ?? ""} ${v[0].meaning ?? ""}`.trim();
    } catch {
      /* ignore */
    }
    return "—";
  }

  return (
    <div className="space-y-4 animate-in-slide">
      <PageHeader
        icon={AlertTriangle}
        title="错词本"
        description="翻卡/听写/拼写中没记牢的词自动收进这里，练到会为止"
        gradient
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" disabled={unmastered === 0}>
          <Link href="/vocab/dictation?source=mistakes&n=20">
            <Headphones className="h-3.5 w-3.5" />
            听写未掌握错词（{unmastered}）
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" disabled={unmastered === 0}>
          <Link href="/vocab/study?mistakes=1">
            <BookOpen className="h-3.5 w-3.5" />
            翻卡复习
          </Link>
        </Button>
        <div className="ml-auto">
          <MistakeClearButton disabled={rows.length === 0} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">未掌握</CardTitle>
            <CardDescription>还会写错的词</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{unmastered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Check className="h-4 w-4 text-success" />
              已掌握
            </CardTitle>
            <CardDescription>错词听写中答对的词</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{mastered}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {rows.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="还没有错词"
              description="做一轮翻卡、拼写或听写练习，没记牢的词会自动收集到这里。"
              action={
                <Button asChild>
                  <Link href="/vocab/dictation">去听写</Link>
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border/50">
              {rows.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/vocab/${m.word.id}`} className="font-medium hover:text-primary">
                        {m.word.spelling}
                      </Link>
                      {m.word.ipa && <span className="font-mono text-xs text-muted-foreground">{m.word.ipa}</span>}
                      <WordTTS text={m.word.spelling} />
                      {m.mastered && (
                        <Badge variant="secondary" className="text-success">
                          <Check className="h-3 w-3" />
                          已掌握
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>{firstMeaning(m.word.translations)}</span>
                      {m.wrongAnswer && <span>写错成：{m.wrongAnswer}</span>}
                      <span>错 {m.count} 次</span>
                      <span>{new Date(m.lastWrongAt).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </div>
                  <MistakeRowActions wordId={m.word.id} mastered={m.mastered} />
                </div>
              ))}
              {rows.length >= 200 && (
                <p className="py-2 text-center text-xs text-muted-foreground">仅展示最近 200 条。</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}