import Link from "next/link";
import { TEMPLATES, type Template } from "@/lib/writing/seed-templates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Copy } from "lucide-react";

const CAT_LABEL: Record<Template["category"], string> = {
  "task1-intro": "T1 引言",
  "task1-overview": "T1 概述",
  "task1-body": "T1 主体",
  "task2-intro": "T2 引言",
  "task2-body": "T2 论证 / 让步",
  "task2-conclusion": "T2 结论",
};

const CAT_ORDER: Template["category"][] = [
  "task2-intro",
  "task2-body",
  "task2-conclusion",
  "task1-intro",
  "task1-overview",
  "task1-body",
];

export default function TemplatesPage() {
  const grouped = new Map<Template["category"], Template[]>();
  for (const t of TEMPLATES) {
    if (!grouped.has(t.category)) grouped.set(t.category, []);
    grouped.get(t.category)!.push(t);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/writing">
              <ArrowLeft className="h-4 w-4" /> 返回写作
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">模板库</h1>
          <p className="text-muted-foreground">按分段选用；照抄不加分，用来化学习结构和常用表达</p>
        </div>
      </div>

      <Tabs defaultValue="task2-intro">
        <TabsList>
          {CAT_ORDER.map((k) => (
            <TabsTrigger key={k} value={k}>
              {CAT_LABEL[k]}
            </TabsTrigger>
          ))}
        </TabsList>
        {CAT_ORDER.map((cat) => (
          <TabsContent key={cat} value={cat} className="space-y-3">
            {(grouped.get(cat) ?? []).map((t) => (
              <Card key={t.id}>
                <CardHeader>
                  <CardTitle className="text-base">{t.label}</CardTitle>
                  <CardDescription className="mt-1">{t.notes}</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm leading-relaxed">
                    {t.content}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
