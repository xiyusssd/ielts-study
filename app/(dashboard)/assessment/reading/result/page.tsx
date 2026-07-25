import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getReadingSet } from "@/lib/assessment/pools/pick";
import { isCorrect } from "@/lib/assessment/pools/types";
import { bandFeedback } from "@/lib/scoring/band-mapper";
import type { AssessmentResults } from "@/lib/assessment/types";
import { SectionResultView } from "@/components/assessment/section-result";

export const dynamic = "force-dynamic";

export default async function ReadingResultPage() {
  const user = await requireUser();
  if (!user) return null;
  const latest = await prisma.assessment.findFirst({
    where: { userId: user.id, type: "initial" },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) redirect("/assessment");
  const results = JSON.parse(latest.results) as AssessmentResults;
  const section = results.sections.reading;
  if (!section) redirect("/assessment/reading");

  const raw = (section.raw ?? {}) as { correct?: number; total?: number; poolId?: string };
  const answers = section.answers as Record<string, string>;
  const set = raw.poolId ? getReadingSet(raw.poolId) : undefined;
  const review =
    set?.questions.map((q) => ({
      prompt: q.prompt,
      userAnswer: answers[q.id] ?? "（未作答）",
      correctAnswer: q.answer,
      ok: isCorrect(answers[q.id], q.answer, q.accept),
    })) ?? [];

  return (
    <SectionResultView
      title="阅读测试结果"
      band={section.score ?? 0}
      correct={raw.correct ?? 0}
      total={raw.total ?? 0}
      feedback={bandFeedback("reading", section.score ?? 0)}
      review={review}
      nextHref="/assessment/writing"
      nextLabel="继续 · 写作测试"
    />
  );
}
