import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Volume2 } from "lucide-react";
import { WordTTS } from "@/components/vocab/word-tts";

export default async function WordDetailPage({ params }: { params: Promise<{ wordId: string }> }) {
  const user = await requireUser();
  if (!user) return null;
  const { wordId } = await params;
  const word = await prisma.word.findUnique({ where: { id: wordId } });
  if (!word) notFound();

  const progress = await prisma.vocabProgress.findUnique({
    where: { userId_wordId: { userId: user.id, wordId: word.id } },
  });

  const translations = JSON.parse(word.translations) as { pos: string; meaning: string }[];
  const examples = JSON.parse(word.examples) as { en: string; zh: string }[];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link href="/vocab">
          <ArrowLeft className="h-4 w-4" /> 返回词汇
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-4xl">{word.spelling}</CardTitle>
              <div className="mt-2 flex items-center gap-3 text-muted-foreground">
                {word.ipa && <span>{word.ipa}</span>}
                <WordTTS text={word.spelling} />
                <span className="rounded bg-muted px-2 py-0.5 text-xs">Level {word.level}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">释义</h3>
            <div className="space-y-1">
              {translations.map((t, i) => (
                <div key={i}>
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{t.pos}</span>
                  {t.meaning}
                </div>
              ))}
            </div>
          </section>

          {examples.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">例句</h3>
              <div className="space-y-3">
                {examples.map((e, i) => (
                  <div key={i} className="rounded-md bg-muted/50 p-3 text-sm">
                    <div className="italic">{e.en}</div>
                    <div className="mt-1 text-muted-foreground">{e.zh}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {progress && (
            <section>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">学习状态</h3>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Stat label="复习次数" value={String(progress.reps)} />
                <Stat label="忘记次数" value={String(progress.lapses)} />
                <Stat label="稳定度" value={progress.stability.toFixed(1) + " 天"} />
                <Stat label="下次复习" value={new Date(progress.dueAt).toLocaleDateString("zh-CN")} />
              </div>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-medium">{value}</div>
    </div>
  );
}
