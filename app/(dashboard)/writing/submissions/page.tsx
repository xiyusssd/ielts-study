import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pen } from "lucide-react";

export default async function AllSubmissionsPage() {
  const user = await requireUser();
  if (!user) return null;
  const submissions = await prisma.writingSubmission.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { prompt: true },
  });

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link href="/writing">
          <ArrowLeft className="h-4 w-4" /> 返回写作
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold">全部写作提交</h1>
        <p className="text-muted-foreground">按时间倒序 · 共 {submissions.length} 篇</p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            还没有提交过作文。<Link href="/writing" className="text-primary underline">去写一篇</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {submissions.map((s) => {
            const scores = JSON.parse(s.scores) as { overall: number; tr: number; cc: number; lr: number; gra: number };
            return (
              <Link
                key={s.id}
                href={`/writing/submissions/${s.id}`}
                className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    <Pen className="mr-1 inline h-3 w-3" />
                    {s.prompt.task === "task1" ? "Task 1" : "Task 2"} · {s.prompt.category}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{s.prompt.prompt.slice(0, 80)}...</div>
                  <div className="mt-1 flex gap-2 text-xs">
                    <span>TR {scores.tr}</span>
                    <span>CC {scores.cc}</span>
                    <span>LR {scores.lr}</span>
                    <span>GRA {scores.gra}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-3">
                  <span className="rounded bg-primary/10 px-2 py-1 font-mono text-sm font-semibold text-primary">
                    {scores.overall}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {s.createdAt.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
