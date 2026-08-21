import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { aiTextReady } from "@/lib/ai/actions";
import { generateDailyQueue } from "@/lib/srs/queue";
import { normalizeDailyGoals, DEFAULT_DAILY_NEW, DEFAULT_REVIEW_RATIO } from "@/lib/vocab/config";
import { StudyCard } from "@/components/vocab/study-card";
import { SpellCard } from "@/components/vocab/spell-card";
import { SentenceCard } from "@/components/vocab/sentence-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SOURCE_LABELS: Record<string, string> = {
  ielts: "雅思", toefl: "托福", gre: "GRE", cet4: "四级", cet6: "六级",
  kaoyan: "考研", gaokao: "高考", zhongkao: "中考", awl: "学术词AWL",
};
const TOPIC_LABELS: Record<string, string> = {
  education: "教育", environment: "环境", technology: "科技", health: "健康",
  business: "商业", history_culture: "历史文化", nature: "自然", psychology: "心理",
  city_transport: "城市交通", art: "艺术", society: "社会", science: "科学",
};

/** 复习与新词小批交替混排：每 2 个新词穿插 1 个复习，某侧耗尽后顺延另一侧 */
function interleave<T>(due: T[], fresh: T[]): T[] {
  const out: T[] = [];
  let d = 0;
  let n = 0;
  while (d < due.length || n < fresh.length) {
    if (d < due.length) out.push(due[d++]);
    for (let k = 0; k < 2 && n < fresh.length; k++) out.push(fresh[n++]);
  }
  return out;
}

export default async function VocabStudyPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; topic?: string; mode?: string; book?: string; mistakes?: string; favorites?: string }>;
}) {
  const user = await requireUser();
  if (!user) return null;

  const { source: urlSource, topic, mode, book: bookId, mistakes, favorites } = await searchParams;
  const spellMode = mode === "spell";
  const sentenceMode = mode === "sentence";
  const mistakesMode = mistakes === "1";
  const favoritesMode = favorites === "1";
  const bookMode = !!bookId;

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const goals = normalizeDailyGoals(
    profile?.dailyNewWords ?? DEFAULT_DAILY_NEW,
    profile?.reviewRatio ?? DEFAULT_REVIEW_RATIO,
  );
  const newLimit = goals.newWords;
  const reviewLimit = goals.reviewWords;

  // URL 显式 source/topic/book/错词/生词本 = 临时筛选；否则回落到锁定词书(正常日常队列)
  const isExplicitFilter = !!urlSource || !!topic || mistakesMode || favoritesMode || bookMode;
  const source = urlSource ?? (isExplicitFilter ? undefined : profile?.vocabBook ?? undefined);
  const filterLabel = bookMode
    ? "词书学习"
    : mistakesMode
      ? "错词复习"
      : favoritesMode
        ? "生词本"
        : urlSource
          ? SOURCE_LABELS[urlSource] ?? urlSource
          : topic
            ? TOPIC_LABELS[topic] ?? topic
            : null;

  const { dueList, newList } = await generateDailyQueue(user.id, {
    // 显式分类学习时只出新词(不掺无关到期词)；日常队列含复习
    newLimit,
    reviewLimit: isExplicitFilter ? 0 : reviewLimit,
    source,
    topic,
    bookId: bookMode ? bookId : undefined,
    mistakes: mistakesMode,
    favorites: favoritesMode,
    // 句子拼写：新词只取带例句的（全库仅少量词有例句，否则过滤后为空）
    requireExamples: sentenceMode,
  });

  // 复习与新词小批交替（每 2 个新词穿插 1 个复习），避免开头整段复习造成疲劳
  const interleaved = interleave(
    dueList.map((d) => ({ word: d.word, isNew: false })),
    newList.map((n) => ({ word: n.word, isNew: true })),
  );
  // 句子拼写只能用有例句的词，过滤掉无例句的
  const items = sentenceMode
    ? interleaved.filter((it) => {
        try {
          const ex = JSON.parse(it.word.examples) as unknown[];
          return Array.isArray(ex) && ex.length > 0;
        } catch {
          return false;
        }
      })
    : interleaved;
  // 模式三态：翻卡 / 单词拼写 / 句子拼写。切换时保留全部筛选参数（来源/话题/词书/错词/生词本）
  const currentMode = mode ?? "";
  const modeHref = (m: string) => {
    const p = new URLSearchParams();
    if (urlSource) p.set("source", urlSource);
    if (topic) p.set("topic", topic);
    if (bookId) p.set("book", bookId);
    if (mistakesMode) p.set("mistakes", "1");
    if (favoritesMode) p.set("favorites", "1");
    if (m) p.set("mode", m);
    const qs = p.toString();
    return `/vocab/study${qs ? `?${qs}` : ""}`;
  };

  const modeLabel = sentenceMode ? "句子拼写" : spellMode ? "单词拼写" : "翻卡模式";

  // 句子模式不走服务端空状态早退：答完最后一句后 reviewWord 触发 RSC 刷新会把
  // 队列清空，若在此 return 会卸载 SentenceCard、顶掉客户端完成页。空状态交给卡片内部处理。
  if (items.length === 0 && !sentenceMode) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <h2 className="text-2xl font-bold">
              {filterLabel ? `「${filterLabel}」暂无新词` : "今日已清空 🎉"}
            </h2>
            <p className="text-muted-foreground">
              {filterLabel ? "该分类的词都已在学习队列中，换个分类试试。" : "没有待复习或新学的单词，来日方长。"}
            </p>
            <Button asChild>
              <Link href="/vocab">返回词汇首页</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold">今日学习</h1>
            <p className="text-sm text-muted-foreground">
              {dueList.length} 复习 · {newList.length} 新词 · {modeLabel}
            </p>
          </div>
          {filterLabel && <Badge variant="default">{filterLabel}</Badge>}
        </div>
        <div className="flex rounded-lg border border-border/60 bg-muted/50 p-1">
          {[
            { key: "", label: "翻卡" },
            { key: "spell", label: "单词拼写" },
            { key: "sentence", label: "句子拼写" },
          ].map((m) => (
            <Link
              key={m.key}
              href={modeHref(m.key)}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                (currentMode === m.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {m.label}
            </Link>
          ))}
        </div>
      </div>
      {sentenceMode ? (
        <SentenceCard items={items} aiEnabled={await aiTextReady(user.id)} />
      ) : spellMode ? (
        <SpellCard items={items} />
      ) : (
        <StudyCard items={items} />
      )}
    </div>
  );
}
