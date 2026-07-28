import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Headphones, ArrowRight, Ear, Trophy, FileText } from "lucide-react";

type PassageMeta = { difficulty?: number; topics?: string[]; speakers?: string[]; section?: number };

// 从 source (cambridge:c13-t1-s4) 解析册/套/section；解析不出返回 null
function parseSource(source: string): { book: number; test: number; section: number } | null {
  const m = source.match(/^cambridge:c(\d+)-t(\d+)-s(\d+)/);
  if (!m) return null;
  return { book: Number(m[1]), test: Number(m[2]), section: Number(m[3]) };
}

// 去掉标题里的 "(Cambridge 13, Test 1, Section 4)" 尾巴——分组后是冗余信息
function cleanTitle(title: string): string {
  return title.replace(/\s*\(Cambridge[^)]*\)\s*$/i, "").trim();
}

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
      take: 50,
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

  // 分组：剑桥各册 → VOA → 内置样本
  type Row = (typeof passages)[number];
  const groups = new Map<string, { label: string; order: number; rows: Row[] }>();
  for (const p of passages) {
    const cam = parseSource(p.source);
    let key: string, label: string, order: number;
    if (cam) {
      key = `cam-${cam.book}`;
      label = `剑桥 ${cam.book}`;
      order = 100 + cam.book;
    } else if (p.source.startsWith("voa-listen")) {
      key = "voa";
      label = "VOA 泛听";
      order = 900;
    } else {
      key = "seed";
      label = "入门样本";
      order = 800;
    }
    if (!groups.has(key)) groups.set(key, { label, order, rows: [] });
    groups.get(key)!.rows.push(p);
  }
  const sortedGroups = [...groups.values()].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6 animate-in-slide">
      <PageHeader
        icon={Headphones}
        title="听力"
        description="4 大 Section 题型 · 支持精听模式"
        gradient
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="可用题目" value={String(passages.length)} icon={FileText} />
        <StatCard label="历史做题" value={String(listeningAttempts.length)} icon={ArrowRight} />
        <StatCard label="最高 Band" value={bestBand > 0 ? String(bestBand) : "—"} icon={Trophy} highlight />
      </div>

      {passages.length === 0 ? (
        <EmptyState icon={Headphones} title="听力题库为空" description="运行 seed-listening 脚本导入内置样本" />
      ) : (
        <div className="space-y-8">
          {sortedGroups.map((g) => (
            <section key={g.label}>
              <div className="mb-2.5 flex items-baseline gap-2">
                <h2 className="text-base font-semibold">{g.label}</h2>
                <span className="nums text-xs text-muted-foreground">{g.rows.length} 篇</span>
              </div>
              <Card className="divide-y divide-border/60 overflow-hidden p-0">
                {g.rows.map((p) => {
                  const meta = JSON.parse(p.metadata) as PassageMeta;
                  const cam = parseSource(p.source);
                  const section = cam?.section ?? meta.section;
                  const my = byPassage.get(p.id) ?? [];
                  const best = my.reduce((m, a) => Math.max(m, a.band ?? 0), 0);
                  return (
                    <div key={p.id} className="group relative flex items-center gap-3 pr-3 transition-colors hover:bg-muted/40">
                      {/* 整行主操作：做题 */}
                      <Link href={`/listening/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 focus:outline-none">
                        {cam && (
                          <span className="nums w-14 shrink-0 text-xs font-medium text-muted-foreground">
                            {`T${cam.test}·S${cam.section}`}
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{cleanTitle(p.title)}</span>
                        {best > 0 && (
                          <span className="nums shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                            {best}
                          </span>
                        )}
                        <span className="nums hidden shrink-0 text-xs text-muted-foreground sm:inline">
                          {p._count.questions} 题{section ? ` · S${section}` : ""}
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                      </Link>
                      {/* 次要操作：精听 */}
                      <Link
                        href={`/listening/${p.id}/dictation`}
                        title="精听（听写）"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <Ear className="h-4 w-4" />
                      </Link>
                    </div>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, highlight }: {
  label: string; value: string; icon: typeof Headphones; highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </div>
        <div className={`font-display nums mt-1 text-3xl font-bold ${highlight ? "text-brand-gradient" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
