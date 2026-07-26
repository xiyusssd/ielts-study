import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { generateDailyQueue } from "@/lib/srs/queue";
import { StudyCard } from "@/components/vocab/study-card";
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
  searchParams: Promise<{ source?: string; topic?: string }>;
}) {
  const user = await requireUser();
  if (!user) return null;

  const { source, topic } = await searchParams;
  const filterLabel = source
    ? SOURCE_LABELS[source] ?? source
    : topic
      ? TOPIC_LABELS[topic] ?? topic
      : null;

  const { dueList, newList } = await generateDailyQueue(user.id, {
    // 分类学习时只出新词（按来源/话题），不掺入无关到期词
    newLimit: filterLabel ? 20 : 20,
    reviewLimit: filterLabel ? 0 : 100,
    source,
    topic,
  });

  const items = [
    ...dueList.map((d) => ({ word: d.word, isNew: false })),
    ...newList.map((n) => ({ word: n.word, isNew: true })),
  ];

  if (items.length === 0) {
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
      <div className="mb-4 flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">今日学习</h1>
          <p className="text-sm text-muted-foreground">
            {dueList.length} 复习 · {newList.length} 新词
          </p>
        </div>
        {filterLabel && <Badge variant="default">{filterLabel}</Badge>}
      </div>
      <StudyCard items={items} remaining={items.length} />
    </div>
  );
}
