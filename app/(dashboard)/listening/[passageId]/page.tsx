import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ListeningRunner } from "@/components/listening/listening-runner";

export default async function ListeningPassagePage({
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
  if (!passage || passage.module !== "listening") notFound();

  const questions = passage.questions.map((q) => ({
    id: q.id,
    index: q.index,
    type: q.type as "tfng" | "mcq" | "matching" | "gapfill" | "heading",
    prompt: q.prompt,
    options: q.options ? JSON.parse(q.options) : null,
  }));

  return (
    <ListeningRunner
      passageId={passage.id}
      title={passage.title}
      transcript={passage.content}
      audioUrl={passage.audioPath}
      questions={questions}
    />
  );
}
