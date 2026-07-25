import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PHRASE_LIBRARY } from "@/lib/speaking/seed-prompts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Mic, ArrowRight, Sparkles } from "lucide-react";

export default async function SpeakingPage() {
  const user = await requireUser();
  if (!user) return null;

  const [p1, p2, p3, sessions] = await Promise.all([
    prisma.speakingPrompt.count({ where: { part: 1, active: true } }),
    prisma.speakingPrompt.count({ where: { part: 2, active: true } }),
    prisma.speakingPrompt.count({ where: { part: 3, active: true } }),
    prisma.speakingSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const avgOverall = sessions.length
    ? (
        sessions.reduce((sum, s) => sum + (JSON.parse(s.scores).overall ?? 0), 0) / sessions.length
      ).toFixed(1)
    : null;

  const partCards = [
    { part: 1, title: "Part 1", desc: "个人话题 · 4-5 分钟", count: p1, gradient: "from-violet-500 to-purple-500" },
    { part: 2, title: "Part 2", desc: "Cue Card 独白 · 3-4 分钟", count: p2, gradient: "from-fuchsia-500 to-pink-500" },
    { part: 3, title: "Part 3", desc: "深入讨论 · 4-5 分钟", count: p3, gradient: "from-purple-500 to-indigo-500" },
  ];

  return (
    <div className="space-y-6 animate-in-slide">
      <PageHeader
        icon={Mic}
        title="口语"
        description="文本训练默认可用 · 配置 API Key 可开启 Realtime 语音对话"
        gradient
      />

      <div className="grid gap-4 md:grid-cols-3">
        {partCards.map((c) => (
          <Link key={c.part} href={`/speaking/part${c.part}`} className="group block">
            <Card className="relative overflow-hidden card-hoverable">
              <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-0 transition-opacity group-hover:opacity-5`} />
              <CardHeader>
                <div className={`mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${c.gradient} text-white shadow-soft`}>
                  <Mic className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{c.title}</CardTitle>
                <CardDescription>{c.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3 text-sm text-muted-foreground">{c.count} 题</div>
                <Button asChild className="w-full" variant="soft">
                  <span>开始练习 <ArrowRight className="h-4 w-4" /></span>
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近训练</CardTitle>
            <CardDescription>平均分：<span className="text-brand-gradient font-semibold">{avgOverall ?? "—"}</span></CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.map((s) => {
                const scores = JSON.parse(s.scores);
                return (
                  <Link
                    key={s.id}
                    href={`/speaking/sessions/${s.id}`}
                    className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted transition-colors"
                  >
                    <div>
                      <div className="font-medium">Part {s.part}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.createdAt.toLocaleString("zh-CN")}
                        {s.provider && <span className="ml-2 rounded bg-muted px-1">{s.provider}</span>}
                      </div>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono font-semibold text-primary">
                      {scores.overall}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            高频万能短语
          </CardTitle>
          <CardDescription>背 1-2 组填充在回答里，Fluency 立即不一样</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {PHRASE_LIBRARY.map((g) => (
            <div key={g.title} className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-1 font-medium">{g.title}</div>
              <div className="mb-2 text-xs text-muted-foreground">{g.usage}</div>
              <ul className="space-y-1 text-sm">
                {g.phrases.map((p, i) => (
                  <li key={i} className="italic text-muted-foreground">
                    <span className="mr-1">·</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
