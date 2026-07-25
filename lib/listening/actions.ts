"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserOrRedirect } from "@/lib/auth/require";
import { listeningReadingBand } from "@/lib/scoring/band-mapper";

export async function submitListeningAttempt(input: {
  passageId: string;
  answers: Record<string, string>;
  duration: number;
}) {
  const user = await requireUserOrRedirect();

  const questions = await prisma.question.findMany({
    where: { passageId: input.passageId },
    orderBy: { index: "asc" },
  });

  let correct = 0;
  const graded: Record<string, { user: string; correct: string; ok: boolean }> = {};
  for (const q of questions) {
    const std = JSON.parse(q.answer) as string | string[];
    const stdStr = Array.isArray(std) ? std[0] : std;
    const userAns = (input.answers[q.id] ?? "").trim();
    const ok = matchAnswer(userAns, std);
    if (ok) correct++;
    graded[q.id] = { user: userAns, correct: stdStr, ok };
  }

  const band = listeningReadingBand(correct, questions.length);
  const attempt = await prisma.attempt.create({
    data: {
      userId: user.id,
      passageId: input.passageId,
      answers: JSON.stringify(graded),
      score: questions.length ? correct / questions.length : 0,
      band,
      duration: input.duration,
    },
  });

  revalidatePath("/listening");
  redirect(`/listening/${input.passageId}/result/${attempt.id}`);
}

function matchAnswer(user: string, std: string | string[]): boolean {
  if (!user) return false;
  const list = Array.isArray(std) ? std : [std];
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.。,，]$/, "");
  return list.some((a) => norm(a) === norm(user));
}
