import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { BookCreateForm } from "@/components/vocab/book-create-form";
import { BookDeleteButton } from "@/components/vocab/book-delete-button";
import {
  BookMarked,
  BookOpen,
  ArrowRight,
  Headphones,
  PenLine,
  User,
} from "lucide-react";

export default async function BooksPage() {
  const user = await requireUser();
  if (!user) return null;

  const [official, custom] = await Promise.all([
    prisma.wordBook.findMany({
      where: { kind: "official" },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { chapters: true } } },
    }),
    prisma.wordBook.findMany({
      where: { kind: "custom", userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { chapters: true } },
        chapters: { select: { _count: { select: { words: true } } }, take: 1 },
      },
    }),
  ]);

  const officialWordCounts = await Promise.all(
    official.map((b) =>
      prisma.chapterWord.count({ where: { chapter: { bookId: b.id } } }),
    ),
  );

  return (
    <div className="space-y-6 animate-in-slide">
      <PageHeader
        icon={BookMarked}
        title="词书库"
        description="官方真题词书 + 你的自定义词书"
        gradient
      />

      {/* 官方词书 */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          官方词书
        </h2>
        {official.length === 0 ? (
          <EmptyState
            title="暂无官方词书"
            description="运行 scripts/build-book-vocab.ts 从剑桥真题生成词书。"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {official.map((b, i) => (
              <Card key={b.id} className="transition-shadow hover:shadow-soft">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{b.title}</CardTitle>
                      {b.description && (
                        <CardDescription className="mt-1 line-clamp-2">{b.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant="secondary">官方</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex gap-4 text-sm text-muted-foreground">
                    <span>{b._count.chapters} 章</span>
                    <span>{officialWordCounts[i]} 词</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={`/vocab/books/${b.id}`}>
                        查看词书
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/vocab/study?book=${b.id}`}>
                        <BookOpen className="h-3.5 w-3.5" />
                        翻卡学习
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/vocab/dictation?book=${b.id}`}>
                        <Headphones className="h-3.5 w-3.5" />
                        听写
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 自定义词书 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <User className="h-4 w-4" />
            我的词书
          </h2>
          <BookCreateForm />
        </div>
        {custom.length === 0 ? (
          <EmptyState
            title="还没有自定义词书"
            description="新建一本词书，然后在单词详情页把要背的词加进去。"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {custom.map((b) => (
              <Card key={b.id} className="transition-shadow hover:shadow-soft">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{b.title}</CardTitle>
                      {b.description && (
                        <CardDescription className="mt-1 line-clamp-2">{b.description}</CardDescription>
                      )}
                    </div>
                    <BookDeleteButton bookId={b.id} title={b.title} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 text-sm text-muted-foreground">
                    {b.chapters[0]?._count.words ?? 0} 词
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={`/vocab/books/${b.id}`}>
                        管理词书
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/vocab/study?book=${b.id}`}>
                        <BookOpen className="h-3.5 w-3.5" />
                        翻卡学习
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/vocab/dictation?book=${b.id}`}>
                        <PenLine className="h-3.5 w-3.5" />
                        听写
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}