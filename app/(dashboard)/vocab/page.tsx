import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { generateDailyQueue } from "@/lib/srs/queue";
import { normalizeDailyGoals, DEFAULT_DAILY_NEW, DEFAULT_REVIEW_RATIO } from "@/lib/vocab/config";
import { DailyGoals } from "@/components/vocab/daily-goals";
import { BookPicker } from "@/components/vocab/book-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { ArrowRight, BookMarked, Flame, TrendingUp, Languages, Layers, Tag, PenLine, Headphones, Star, Sparkles, XCircle, Library, AlignLeft } from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  ielts: "雅思", toefl: "托福", gre: "GRE", cet4: "四级", cet6: "六级",
  kaoyan: "考研", gaokao: "高考", zhongkao: "中考", awl: "学术词AWL",
};
const TOPIC_LABELS: Record<string, string> = {
  education: "教育", environment: "环境", technology: "科技", health: "健康",
  business: "商业", history_culture: "历史文化", nature: "自然", psychology: "心理",
  city_transport: "城市交通", art: "艺术", society: "社会", science: "科学",
};
const SOURCE_ORDER = ["ielts", "toefl", "cet6", "cet4", "gre", "awl", "kaoyan", "gaokao"];

export default async function VocabPage() {
  const user = await requireUser();
  if (!user) return null;

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const goals = normalizeDailyGoals(
    profile?.dailyNewWords ?? DEFAULT_DAILY_NEW,
    profile?.reviewRatio ?? DEFAULT_REVIEW_RATIO,
  );
  const dailyNew = goals.newWords;
  const dailyReview = goals.reviewWords;
  const reviewRatio = goals.ratio;
  const lockedBook = profile?.vocabBook ?? null; // 锁定词书：今日新词只从该书抽

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [queue, totalLearned, byLevel, recent, mistakeCount, favCount, bookCount, todayLearned] = await Promise.all([
    generateDailyQueue(user.id, { newLimit: dailyNew, reviewLimit: dailyReview, source: lockedBook ?? undefined }),
    prisma.vocabProgress.count({ where: { userId: user.id } }),
    prisma.$queryRawUnsafe<{ level: number; c: bigint }[]>(
      `SELECT w.level, COUNT(*) as c FROM VocabProgress vp
       JOIN Word w ON w.id = vp.wordId
       WHERE vp.userId = ? GROUP BY w.level ORDER BY w.level`,
      user.id,
    ),
    prisma.vocabProgress.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { word: true },
    }),
    prisma.mistakeWord.count({ where: { userId: user.id, mastered: false } }),
    prisma.favoriteWord.count({ where: { userId: user.id } }),
    prisma.wordBook.count(),
    prisma.vocabProgress.count({ where: { userId: user.id, updatedAt: { gte: startOfToday } } }),
  ]);

  const totalToStudy = queue.dueList.length + queue.newList.length;
  // 真实今日进度：今天过过的词 / (已过 + 剩余队列)
  const donePct = Math.min(100, Math.round((todayLearned / Math.max(1, todayLearned + totalToStudy)) * 100));

  // 分类计数：按来源(裸 token)与话题(t: 前缀)统计词库覆盖，供分类学习入口
  const srcCounts = await Promise.all(
    SOURCE_ORDER.map(async (s) => ({ key: s, n: await prisma.word.count({ where: { tags: { contains: s } } }) })),
  );
  const topicCounts = await Promise.all(
    Object.keys(TOPIC_LABELS).map(async (t) => ({ key: t, n: await prisma.word.count({ where: { tags: { contains: `t:${t}` } } }) })),
  );
  const sources = srcCounts.filter((x) => x.n > 0);
  const topics = topicCounts.filter((x) => x.n > 0).sort((a, b) => b.n - a.n);

  return (
    <div className="space-y-6 animate-in-slide">
      <PageHeader
        icon={Languages}
        title="词汇"
        description="Shanbay 风格间隔重复 · FSRS 算法"
        gradient
      />

      <Card className="overflow-hidden border-primary/40">
        <div className="bg-brand-gradient p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm text-white/80">
                <Flame className="h-4 w-4" />
                今日队列
              </div>
              <div className="text-3xl font-bold">{totalToStudy} 词</div>
              <div className="mt-1 text-sm text-white/70">
                {todayLearned} 已过 · {queue.dueList.length} 待复习 · {queue.newList.length} 新词
              </div>
            </div>
            {totalToStudy > 0 ? (
              <div className="flex flex-col gap-2">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                  <Link href="/vocab/study">
                    翻卡学习
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1 border-white/50 bg-transparent text-white hover:bg-white/10">
                    <Link href="/vocab/study?mode=spell">
                      <PenLine className="h-4 w-4" />
                      单词拼写
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1 border-white/50 bg-transparent text-white hover:bg-white/10">
                    <Link href="/vocab/study?mode=sentence">
                      <AlignLeft className="h-4 w-4" />
                      句子拼写
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-white/10 px-4 py-2 text-sm backdrop-blur">今日已清空 🎉</div>
            )}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${donePct}%` }} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 词汇工具入口 */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-primary" />
              词汇工具
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              <ToolLink href="/vocab/books" icon={Library} label="真题词书" count={bookCount} />
              <ToolLink href="/vocab/dictation" icon={Headphones} label="单词听写" />
              <ToolLink href="/vocab/mistakes" icon={XCircle} label="错词复习" count={mistakeCount} />
              <ToolLink href="/vocab/favorites" icon={Star} label="生词本" count={favCount} />
              <ToolLink href="/vocab/story" icon={Sparkles} label="AI 小故事" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              总进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-brand-gradient">{totalLearned}</div>
            <div className="text-sm text-muted-foreground">已学单词数</div>
            <div className="mt-4 space-y-1.5 text-sm">
              {byLevel.map((l) => (
                <div key={l.level} className="flex items-center justify-between">
                  <span className="text-muted-foreground">CEFR Level {l.level}</span>
                  <span className="font-mono font-medium">{Number(l.c)}</span>
                </div>
              ))}
              {byLevel.length === 0 && <div className="text-xs text-muted-foreground">还没学过词</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookMarked className="h-4 w-4 text-primary" />
              最近学习
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">还没有学过的单词</p>
            ) : (
              <div className="space-y-0.5 text-sm">
                {recent.map((r) => (
                  <Link
                    key={r.id}
                    href={`/vocab/${r.wordId}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.word.spelling}</span>
                      {firstMeaning(r.word.translations) && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {firstMeaning(r.word.translations)}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      L{r.word.level} · × {r.reps}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 词书 + 每日目标并排，缩短首页纵向长度 */}
      <div className="grid gap-4 md:grid-cols-2">
        <BookPicker current={lockedBook} counts={Object.fromEntries(srcCounts.map((s) => [s.key, s.n]))} />
        <DailyGoals newWords={dailyNew} ratio={reviewRatio} />
      </div>

      {(sources.length > 0 || topics.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-primary" />
              按分类学习
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sources.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <BookMarked className="h-3.5 w-3.5" /> 词汇书
                </div>
                <div className="flex flex-wrap gap-2">
                  {sources.map((s) => (
                    <Link key={s.key} href={`/vocab/study?source=${s.key}`}>
                      <Badge variant="default" className="cursor-pointer hover:bg-primary/20">
                        {SOURCE_LABELS[s.key] ?? s.key}
                        <span className="ml-1 opacity-60">{s.n}</span>
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {topics.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" /> 雅思话题
                </div>
                <div className="flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <Link key={t.key} href={`/vocab/study?topic=${t.key}`}>
                      <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/70">
                        {TOPIC_LABELS[t.key] ?? t.key}
                        <span className="ml-1 opacity-60">{t.n}</span>
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** 取第一个释义做列表预览；translations 是 JSON 数组 [{pos, meaning}]。 */
function firstMeaning(translations: string): string {
  try {
    const arr = JSON.parse(translations) as { pos: string; meaning: string }[];
    return arr[0]?.meaning ?? "";
  } catch {
    return "";
  }
}

function ToolLink({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  icon: typeof Headphones;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2 rounded-xl border border-border/60 p-4 text-center transition-all hover:border-primary/40 hover:bg-primary/5"
    >
      <Icon className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
      <span className="text-sm font-medium">{label}</span>
      {count != null && <span className="text-xs text-muted-foreground">{count} 个</span>}
    </Link>
  );
}
