import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, X } from "lucide-react";

type ReviewItem = { prompt: string; userAnswer: string; correctAnswer: string; ok: boolean };

export function SectionResultView({
  title,
  band,
  correct,
  total,
  feedback,
  review,
  nextHref,
  nextLabel,
}: {
  title: string;
  band: number;
  correct: number;
  total: number;
  feedback: string;
  review: ReviewItem[];
  nextHref: string;
  nextLabel: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">每题对错与正确答案见下方</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">雅思水平</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Band {band || "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">正确率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {correct}/{total}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">逐题回顾</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {review.map((item, i) => (
            <div key={i} className="space-y-1 border-b pb-3 text-sm last:border-b-0">
              <div className="flex items-start gap-2 font-medium">
                {item.ok ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                )}
                <span>
                  {i + 1}. {item.prompt}
                </span>
              </div>
              <div className="pl-6 text-xs">
                <span className={item.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                  你的答案：{item.userAnswer}
                </span>
                {!item.ok && (
                  <span className="ml-3 text-muted-foreground">正确答案：{item.correctAnswer}</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">建议</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{feedback}</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild>
          <Link href={nextHref}>
            {nextLabel} <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
