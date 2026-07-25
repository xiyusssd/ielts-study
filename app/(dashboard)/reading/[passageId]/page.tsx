import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ReadingRunner } from "@/components/reading/reading-runner";

export default async function ReadingPassagePage({
  params,
}: {
  params: Promise<{ passageId: string }>;
}) {
  const user = await requireUser();
  if (!user) return null;
  const { passageId } = await params;

  const passage = await prisma.passage.findUnique({
    where: { id: passageId },
    include: { questions: { orderBy: { index: "asc" } } },
  });
  if (!passage || passage.module !== "reading") notFound();

  const questions = passage.questions.map((q) => ({
    id: q.id,
    index: q.index,
    type: q.type as "tfng" | "mcq" | "matching" | "gapfill" | "heading",
    prompt: q.prompt,
    options: q.options ? JSON.parse(q.options) : null,
  }));

  return (
    <div>
      <div className="mb-3">
        <h1 className="text-2xl font-bold">阅读练习</h1>
        <p className="text-sm text-muted-foreground">
          {passage.title} · {questions.length} 题 · 60 分钟
        </p>
      </div>
      <ReadingRunner
        passageId={passage.id}
        title={passage.title}
        content={passage.content}
        questions={questions}
      />
    </div>
  );
}
