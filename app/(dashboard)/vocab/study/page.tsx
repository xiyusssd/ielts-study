import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { generateDailyQueue } from "@/lib/srs/queue";
import { StudyCard } from "@/components/vocab/study-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function VocabStudyPage() {
  const user = await requireUser();
  if (!user) return null;

  const { dueList, newList } = await generateDailyQueue(user.id, {
    newLimit: 20,
    reviewLimit: 100,
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
            <h2 className="text-2xl font-bold">今日已清空 🎉</h2>
            <p className="text-muted-foreground">没有待复习或新学的单词，来日方长。</p>
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
      <div className="mb-4">
        <h1 className="text-2xl font-bold">今日学习</h1>
        <p className="text-sm text-muted-foreground">
          {dueList.length} 复习 · {newList.length} 新词
        </p>
      </div>
      <StudyCard items={items} remaining={items.length} />
    </div>
  );
}
