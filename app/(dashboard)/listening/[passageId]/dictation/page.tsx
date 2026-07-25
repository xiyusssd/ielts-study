import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { DictationMode } from "@/components/listening/dictation-mode";

export default async function DictationPage({
  params,
}: {
  params: Promise<{ passageId: string }>;
}) {
  const user = await requireUser();
  if (!user) return null;
  const { passageId } = await params;

  const passage = await prisma.passage.findUnique({ where: { id: passageId } });
  if (!passage || passage.module !== "listening") notFound();

  return <DictationMode passageId={passage.id} title={passage.title} transcript={passage.content} />;
}
