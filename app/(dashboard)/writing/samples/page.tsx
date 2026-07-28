import Link from "next/link";
import { SAMPLE_ESSAYS } from "@/lib/writing/seed-templates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const BAND_COLOR: Record<number, string> = {
  6: "bg-orange-100 text-orange-800 dark:bg-orange-900/30",
  7: "bg-blue-100 text-blue-800 dark:bg-blue-900/30",
  8: "bg-green-100 text-green-800 dark:bg-green-900/30",
  9: "bg-purple-100 text-purple-800 dark:bg-purple-900/30",
};

export default function SamplesPage() {
  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/writing">
            <ArrowLeft className="h-4 w-4" /> 返回写作
          </Link>
        </Button>
        <h1 className="mt-2 text-3xl font-bold">范文库</h1>
        <p className="text-muted-foreground">Task 2 议论文 + Task 1 图表 · Band 6 / 7 / 8 对照，每段带专家点评</p>
      </div>

      {([
        { task: "task2" as const, title: "Task 2 · 议论文", desc: "250+ 词，观点/利弊/问题解决/双问题" },
        { task: "task1" as const, title: "Task 1 · 图表与流程", desc: "150+ 词，柱状/折线/流程图" },
      ]).map((group) => {
        const essays = SAMPLE_ESSAYS.filter((s) => s.task === group.task).sort((a, b) => a.band - b.band);
        if (essays.length === 0) return null;
        return (
          <div key={group.task} className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xl font-semibold">{group.title}</h2>
              <span className="text-xs text-muted-foreground">{group.desc}</span>
            </div>
            {essays.map((s) => {
          const paragraphs = s.content.split(/\n\s*\n/).filter((p) => p.trim());
          return (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-mono font-semibold ${BAND_COLOR[s.band]}`}
                      >
                        Band {s.band}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        {s.promptCategory}
                      </span>
                    </div>
                    <CardTitle className="text-base font-normal leading-relaxed">
                      {s.prompt}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {paragraphs.map((para, i) => (
                  <div key={i} className="border-l-4 border-primary/30 pl-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{para}</p>
                    {s.annotations[i] && (
                      <p className="mt-2 rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                        📝 {s.annotations[i].comment}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
          </div>
        );
      })}
    </div>
  );
}
