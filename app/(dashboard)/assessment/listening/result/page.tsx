import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getListeningSet } from "@/lib/assessment/pools/pick";
import { isCorrect } from "@/lib/assessment/pools/types";
import { bandFeedback } from "@/lib/scoring/band-mapper";
import type { AssessmentResults } from "@/lib/assessment/types";
import { SectionResultView } from "@/components/assessment/section-result";

export const dynamic = "force-dynamic";

export default async function ListeningResultPage() {
  const user = await requireUser();
  if (!user) return null;
  const latest = await prisma.assessment.findFirst({
    where: { userId: user.id, type: "initial" },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) redirect("/assessment");
  const results = JSON.parse(latest.results) as AssessmentResults;
  const section = results.sections.listening;
  if (!section) redirect("/assessment/listening");

  const raw = (section.raw ?? {}) as { correct?: number; total?: number; poolId?: string };
  const answers = section.answers as Record<string, string>;
  const set = raw.poolId ? getListeningSet(raw.poolId) : undefined;
  const review =
    set?.questions.map((q) => ({
      prompt: q.prompt,
      userAnswer: answers[q.id] ?? "（未作答）",
      correctAnswer: q.answer,
      ok: isCorrect(answers[q.id], q.answer, q.accept),
    })) ?? [];

  return (
    <SectionResultView
      title="听力测试结果"
      band={section.score ?? 0}
      correct={raw.correct ?? 0}
      total={raw.total ?? 0}
      feedback={bandFeedback("listening", section.score ?? 0)}
      review={review}
      nextHref="/assessment/reading"
      nextLabel="继续 · 阅读测试"
    />
  );
}
