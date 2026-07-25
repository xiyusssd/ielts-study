import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Headphones, ArrowRight, Ear, Trophy, FileText } from "lucide-react";

export default async function ListeningPage() {
  const user = await requireUser();
  if (!user) return null;

  const [passages, attempts] = await Promise.all([
    prisma.passage.findMany({
      where: { module: "listening", active: true },
      include: { _count: { select: { questions: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.attempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const passageIds = new Set(passages.map((p) => p.id));
  const listeningAttempts = attempts.filter((a) => passageIds.has(a.passageId));
  const byPassage = new Map<string, typeof listeningAttempts>();
  for (const a of listeningAttempts) {
    if (!byPassage.has(a.passageId)) byPassage.set(a.passageId, []);
    byPassage.get(a.passageId)!.push(a);
  }
  const bestBand = listeningAttempts.reduce((m, a) => Math.max(m, a.band ?? 0), 0);

  return (
    <div className="space-y-6 animate-in-slide">
      <PageHeader
        icon={Headphones}
        title="听力"
        description="4 大 Section 题型 · 支持精听模式"
        gradient
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="可用题目" value={String(passages.length)} icon={FileText} color="text-amber-500" />
        <StatCard label="历史做题" value={String(listeningAttempts.length)} icon={ArrowRight} color="text-orange-500" />
        <StatCard label="最高 Band" value={bestBand > 0 ? String(bestBand) : "—"} icon={Trophy} color="text-amber-500" highlight />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">题库</h2>
        {passages.length === 0 ? (
          <EmptyState icon={Headphones} title="听力题库为空" description="运行 seed-listening 脚本导入内置样本" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {passages.map((p) => {
              const meta = JSON.parse(p.metadata) as {
                difficulty: number;
                topics: string[];
                speakers: string[];
                section?: number;
              };
              const my = byPassage.get(p.id) ?? [];
              const best = my.reduce((m, a) => Math.max(m, a.band ?? 0), 0);
              return (
                <Card key={p.id} className="card-hoverable">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30">
                        Section {meta.section}
                      </span>
                      {best > 0 && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-700 dark:bg-emerald-900/30">
                          Best {best}
                        </span>
                      )}
                    </div>
                    <CardTitle className="mt-2 text-base">{p.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {p._count.questions} 题 · Band {meta.difficulty} · {meta.speakers?.join(" / ")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/listening/${p.id}/dictation`}>
                          <Ear className="h-3 w-3" />
                          精听
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="flex-1">
                        <Link href={`/listening/${p.id}`}>
                          {my.length > 0 ? "再做" : "做题"}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, highlight }: {
  label: string; value: string; icon: typeof Headphones; color: string; highlight?: boolean;
}) {
  return (
    <Card className="card-hoverable">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className={`h-4 w-4 ${color}`} />
          {label}
        </div>
        <div className={`mt-1 text-3xl font-bold ${highlight ? "text-brand-gradient" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
