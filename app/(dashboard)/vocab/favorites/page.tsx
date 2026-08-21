import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { WordTTS } from "@/components/vocab/word-tts";
import { FavoriteButton } from "@/components/vocab/favorite-button";
import { Star, Headphones, BookOpen, Keyboard } from "lucide-react";

export default async function FavoritesPage() {
  const user = await requireUser();
  if (!user) return null;

  const [favorites, count] = await Promise.all([
    prisma.favoriteWord.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { word: { select: { id: true, spelling: true, ipa: true, translations: true, freq: true } } },
    }),
    prisma.favoriteWord.count({ where: { userId: user.id } }),
  ]);

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
        icon={Star}
        title="生词本"
        description={`已收藏 ${count} 词 · 学习中按 Ctrl+Q 一键收藏`}
        gradient
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" disabled={count === 0}>
          <Link href="/vocab/dictation?source=favorites&n=20">
            <Headphones className="h-3.5 w-3.5" />
            听写生词本
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" disabled={count === 0}>
          <Link href="/vocab/study?favorites=1">
            <BookOpen className="h-3.5 w-3.5" />
            翻卡学习
          </Link>
        </Button>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <Keyboard className="h-3.5 w-3.5" />
          学习中按 Ctrl+Q 收藏当前单词
        </span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">收藏列表</CardTitle>
        </CardHeader>
        <CardContent>
          {favorites.length === 0 ? (
            <EmptyState
              icon={Star}
              title="生词本还是空的"
              description="翻卡/拼写/听写时按 Ctrl+Q 收藏当前单词，或在单词详情页点「加入生词本」。"
              action={
                <Button asChild>
                  <Link href="/vocab/study">去学习</Link>
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border/50">
              {favorites.map((f) => (
                <div key={f.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/vocab/${f.word.id}`} className="font-medium hover:text-primary">
                        {f.word.spelling}
                      </Link>
                      {f.word.ipa && <span className="font-mono text-xs text-muted-foreground">{f.word.ipa}</span>}
                      <WordTTS text={f.word.spelling} />
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>{firstMeaning(f.word.translations)}</span>
                      {f.word.freq > 0 && <span>考频 {f.word.freq}</span>}
                      <span>{new Date(f.createdAt).toLocaleDateString("zh-CN")} 收藏</span>
                    </div>
                  </div>
                  <FavoriteButton wordId={f.word.id} initial={true} />
                </div>
              ))}
              {favorites.length >= 300 && (
                <p className="py-2 text-center text-xs text-muted-foreground">仅展示最近 300 条。</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}