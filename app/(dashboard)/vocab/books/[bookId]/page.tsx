import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BookRenameForm } from "@/components/vocab/book-rename-form";
import { BookWordRemoveButton } from "@/components/vocab/book-word-remove";
import { WordTTS } from "@/components/vocab/word-tts";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Headphones,
  Flame,
  Layers,
} from "lucide-react";

const MAX_WORDS_SHOWN = 300;

function firstMeaning(translations: string): string {
  try {
    const v = JSON.parse(translations);
    if (Array.isArray(v) && v.length > 0) return `${v[0].pos ?? ""} ${v[0].meaning ?? ""}`.trim();
  } catch {
    /* ignore */
  }
  return "—";
}

export default async function BookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ chapter?: string }>;
}) {
  const user = await requireUser();
  if (!user) return null;
  const { bookId } = await params;
  const { chapter: chapterParam } = await searchParams;

  const book = await prisma.wordBook.findUnique({ where: { id: bookId } });
  if (!book) notFound();
  const isOwn = book.kind === "custom" && book.userId === user.id;

  const chapters = await prisma.wordChapter.findMany({
    where: { bookId: book.id },
    orderBy: { index: "asc" },
    include: { _count: { select: { words: true } } },
  });

  // 自定义词书只有一个章节，直接展示其词表；官方词书按选中章节展示
  const selected = isOwn
    ? chapters[0]
    : chapters.find((c) => c.id === chapterParam) ?? chapters[0];

  const rows = selected
    ? await prisma.chapterWord.findMany({
        where: { chapterId: selected.id },
        orderBy: [{ index: "asc" }],
        take: MAX_WORDS_SHOWN,
        include: { word: { select: { id: true, spelling: true, ipa: true, translations: true, freq: true } } },
      })
    : [];

  const totalWords = chapters.reduce((acc, c) => acc + c._count.words, 0);

  return (
    <div className="space-y-4 animate-in-slide">
      <Button asChild variant="ghost" size="sm">
        <Link href="/vocab/books">
          <ArrowLeft className="h-4 w-4" />
          返回词书库
        </Link>
      </Button>

      {/* 词书头 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {book.title}
                <Badge variant={book.kind === "official" ? "secondary" : "default"}>
                  {book.kind === "official" ? "官方" : "我的词书"}
                </Badge>
              </CardTitle>
              {book.description && <CardDescription className="mt-1">{book.description}</CardDescription>}
            </div>
            {isOwn && (
              <BookRenameForm bookId={book.id} title={book.title} description={book.description} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              {chapters.length} 章
            </span>
            <span className="flex items-center gap-1.5">
              <BookMarked className="h-4 w-4" />
              {totalWords} 词
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={`/vocab/study?book=${book.id}`}>
                <BookOpen className="h-3.5 w-3.5" />
                翻卡学习本词书
              </Link>
            </Button>
            {selected && (
              <Button asChild size="sm">
                <Link href={`/vocab/dictation?book=${book.id}&chapter=${selected.id}`}>
                  <Headphones className="h-3.5 w-3.5" />
                  听写本章
                </Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href={`/vocab/dictation?book=${book.id}`}>
                <Headphones className="h-3.5 w-3.5" />
                听写整本
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* 章节导航（官方词书） */}
        {!isOwn && chapters.length > 1 && (
          <Card className="h-fit lg:sticky lg:top-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">章节</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[70vh] space-y-0.5 overflow-y-auto p-2">
              {chapters.map((c) => {
                const active = selected?.id === c.id;
                return (
                  <Link
                    key={c.id}
                    href={`/vocab/books/${book.id}?chapter=${c.id}`}
                    className={
                      "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors " +
                      (active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground")
                    }
                  >
                    <span className="truncate">{c.title}</span>
                    <span className="nums ml-2 text-xs opacity-60">{c._count.words}</span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* 单词表 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {selected ? selected.title : "全部单词"}
              <Badge variant="outline" className="nums">
                {rows.length}
              </Badge>
              {selected && !isOwn && (
                <Link
                  href={`/vocab/dictation?book=${book.id}&chapter=${selected.id}`}
                  className="ml-auto text-xs font-normal text-primary hover:underline"
                >
                  听写本章 →
                </Link>
              )}
            </CardTitle>
            {selected?.subtitle && (
              <CardDescription className="text-xs">{selected.subtitle}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <EmptyState
                title={isOwn ? "词书还是空的" : "本章暂无单词"}
                description={isOwn ? "去单词详情页把要背的词加入这本词书。" : undefined}
              />
            ) : (
              <div className="divide-y divide-border/50">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-2">
                    <span className="nums w-8 shrink-0 text-right text-xs text-muted-foreground">
                      {r.index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/vocab/${r.word.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {r.word.spelling}
                      </Link>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.word.ipa && <span className="mr-2 font-mono">{r.word.ipa}</span>}
                        {firstMeaning(r.word.translations)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {r.word.freq > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-orange-500" title="真题考频">
                          <Flame className="h-3 w-3" />
                          {r.word.freq}
                        </span>
                      )}
                      <WordTTS text={r.word.spelling} />
                      {isOwn && <BookWordRemoveButton bookId={book.id} wordId={r.word.id} spelling={r.word.spelling} />}
                    </div>
                  </div>
                ))}
                {rows.length >= MAX_WORDS_SHOWN && (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    仅展示前 {MAX_WORDS_SHOWN} 词，选择章节可查看全部。
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}