"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserOrRedirect } from "@/lib/auth/require";
import { requireUser } from "@/lib/auth/session";
import { listeningReadingBand } from "@/lib/scoring/band-mapper";

/** 提交阅读答卷 */
export async function submitReadingAttempt(input: {
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
  const gradedAnswers: Record<string, { user: string; correct: string; ok: boolean }> = {};
  for (const q of questions) {
    const stdAnswer = JSON.parse(q.answer) as string | string[];
    const stdStr = Array.isArray(stdAnswer) ? stdAnswer.join("|") : stdAnswer;
    const userAns = (input.answers[q.id] ?? "").trim();
    const ok = matchAnswer(userAns, stdAnswer);
    if (ok) correct++;
    gradedAnswers[q.id] = { user: userAns, correct: stdStr, ok };
  }

  const total = questions.length;
  const score = total ? correct / total : 0;
  const band = listeningReadingBand(correct, total);

  const attempt = await prisma.attempt.create({
    data: {
      userId: user.id,
      passageId: input.passageId,
      answers: JSON.stringify(gradedAnswers),
      score,
      band,
      duration: input.duration,
    },
  });

  revalidatePath("/reading");
  revalidatePath(`/reading/${input.passageId}`);
  redirect(`/reading/${input.passageId}/result/${attempt.id}`);
}

function matchAnswer(user: string, std: string | string[]): boolean {
  if (!user) return false;
  const list = Array.isArray(std) ? std : [std];
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.。,，]$/, "");
  return list.some((a) => norm(a) === norm(user));
}

/** 一键把错题里的生词加入词汇学习队列 */
export async function addWordsToVocab(spellings: string[]) {
  const user = await requireUser();
  if (!user) return { ok: false as const, error: "未登录" };
  if (!spellings.length) return { ok: true as const, added: 0 };

  const words = await prisma.word.findMany({
    where: { spelling: { in: spellings.map((s) => s.toLowerCase()) } },
  });
  const existing = await prisma.vocabProgress.findMany({
    where: { userId: user.id, wordId: { in: words.map((w) => w.id) } },
    select: { wordId: true },
  });
  const existingIds = new Set(existing.map((p) => p.wordId));
  const toCreate = words.filter((w) => !existingIds.has(w.id));

  if (toCreate.length === 0) return { ok: true, added: 0, skipped: words.length };

  const now = new Date();
  await prisma.vocabProgress.createMany({
    data: toCreate.map((w) => ({
      userId: user.id,
      wordId: w.id,
      stability: 0,
      difficulty: 5,
      dueAt: now,
    })),
  });

  revalidatePath("/vocab");
  return { ok: true, added: toCreate.length, skipped: existing.length + (spellings.length - words.length) };
}
