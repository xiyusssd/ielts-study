import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { providerReady } from "@/lib/env";
import { generateDailyQueue } from "@/lib/srs/queue";
import { DEFAULT_DAILY_NEW, DEFAULT_DAILY_REVIEW } from "@/lib/vocab/config";
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

export default async function VocabStudyPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; topic?: string; mode?: string }>;
}) {
  const user = await requireUser();
  if (!user) return null;

  const { source: urlSource, topic, mode } = await searchParams;
  const spellMode = mode === "spell";
  const sentenceMode = mode === "sentence";

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const newLimit = profile?.dailyNewWords ?? DEFAULT_DAILY_NEW;
  const reviewLimit = profile?.dailyReviewWords ?? DEFAULT_DAILY_REVIEW;

  // URL 显式 source/topic = 临时筛选(只出新词)；否则回落到锁定词书(正常日常队列)
  const isExplicitFilter = !!urlSource || !!topic;
  const source = urlSource ?? profile?.vocabBook ?? undefined;
  const filterLabel = urlSource
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
    // 句子拼写：新词只取带例句的（全库仅少量词有例句，否则过滤后为空）
    requireExamples: sentenceMode,
  });

  let items = [
    ...dueList.map((d) => ({ word: d.word, isNew: false })),
    ...newList.map((n) => ({ word: n.word, isNew: true })),
  ];
  // 句子拼写只能用有例句的词，过滤掉无例句的
  if (sentenceMode) {
    items = items.filter((it) => {
      try {
        const ex = JSON.parse(it.word.examples) as unknown[];
        return Array.isArray(ex) && ex.length > 0;
      } catch {
        return false;
      }
    });
  }
  // 模式三态循环：翻卡 → 单词拼写 → 句子拼写 → 翻卡
  const nextMode = sentenceMode ? "" : spellMode ? "sentence" : "spell";
  const otherMode = sentenceMode ? "翻卡模式" : spellMode ? "句子拼写" : "单词拼写";
  const otherModeHref = (() => {
    const p = new URLSearchParams();
    if (urlSource) p.set("source", urlSource);
    if (topic) p.set("topic", topic);
    if (nextMode) p.set("mode", nextMode);
    const qs = p.toString();
    return `/vocab/study${qs ? `?${qs}` : ""}`;
  })();

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
        <Button asChild variant="outline" size="sm">
          <Link href={otherModeHref}>切换到{otherMode}</Link>
        </Button>
      </div>
      {sentenceMode ? (
        <SentenceCard items={items} aiEnabled={providerReady("text")} />
      ) : spellMode ? (
        <SpellCard items={items} />
      ) : (
        <StudyCard items={items} remaining={items.length} />
      )}
    </div>
  );
}
