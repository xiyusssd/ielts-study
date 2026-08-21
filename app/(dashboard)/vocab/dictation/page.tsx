import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { resolveDictationItems } from "@/lib/vocab/dictation-source";
import { DictationRunner } from "@/components/vocab/dictation-runner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Headphones, Shuffle, AlertTriangle, Star, BookMarked, ArrowRight } from "lucide-react";

export default async function DictationPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string; chapter?: string; source?: string; n?: string }>;
}) {
  const user = await requireUser();
  if (!user) return null;
  const q = await searchParams;
  const explicit = !!(q.book || q.chapter || q.source);

  if (!explicit) {
    const [mistakeCount, favCount, bookCount] = await Promise.all([
      prisma.mistakeWord.count({ where: { userId: user.id, mastered: false } }),
      prisma.favoriteWord.count({ where: { userId: user.id } }),
      prisma.wordBook.count(),
    ]);
    return (
      <div className="mx-auto max-w-3xl space-y-6 animate-in-slide">
        <PageHeader
          icon={Headphones}
          title="单词听写"
          description="听发音拼单词 · 自动批改 · 错词自动收集"
          gradient
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="transition-shadow hover:shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shuffle className="h-4 w-4 text-primary" />
                随机听写
              </CardTitle>
              <CardDescription>从词库随机抽 20 词，检验整体拼写水平。</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm">
                <Link href="/vocab/dictation?source=random&n=20">
                  开始
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                错词听写
                <Badge variant="outline" className="nums">{mistakeCount}</Badge>
              </CardTitle>
              <CardDescription>专练写错的词，答对自动标记为已掌握。</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" disabled={mistakeCount === 0}>
                <Link href="/vocab/dictation?source=mistakes&n=20">
                  开始
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4 text-primary" />
                生词本听写
                <Badge variant="outline" className="nums">{favCount}</Badge>
              </CardTitle>
              <CardDescription>听写收藏的生词（学习中按 Ctrl+Q 收藏）。</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" disabled={favCount === 0}>
                <Link href="/vocab/dictation?source=favorites&n=20">
                  开始
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookMarked className="h-4 w-4 text-primary" />
                词书听写
                <Badge variant="outline" className="nums">{bookCount}</Badge>
              </CardTitle>
              <CardDescription>从官方真题词书或自定义词书逐章听写。</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <Link href="/vocab/books">
                  去词书库
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const list = await resolveDictationItems(user.id, q);

  if (list.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader icon={Headphones} title="单词听写" gradient />
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <h2 className="text-2xl font-bold">暂无可听写的单词</h2>
            <p className="text-muted-foreground">
              {q.source === "mistakes"
                ? "还没有错词。做一轮听写或拼写练习，写错的词会自动收集到这里。"
                : q.source === "favorites"
                  ? "生词本还是空的。学习时按 Ctrl+Q 收藏单词。"
                  : "该词书还没有单词。"}
            </p>
            <div className="flex justify-center gap-2">
              <Button asChild>
                <Link href="/vocab/dictation?source=random&n=20">随机听写</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/vocab">返回词汇首页</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DictationRunner
      items={list.items}
      scope={list.scope}
      scopeId={list.scopeId}
      label={list.label}
    />
  );
}