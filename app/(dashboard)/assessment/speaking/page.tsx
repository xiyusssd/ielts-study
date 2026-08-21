import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { aiTextReady } from "@/lib/ai/actions";
import { SpeakingTest } from "@/components/assessment/speaking-test";

export const dynamic = "force-dynamic";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function SpeakingAssessmentPage() {
  const user = await requireUser();
  if (!user) return null;
  // 从 DB 随机抽 3 道 Part 1 题
  const p1 = await prisma.speakingPrompt.findMany({ where: { part: 1, active: true } });
  const picked = shuffle(p1).slice(0, 3);
  const questions = picked.map((q) => ({ id: q.id, question: q.question }));
  return <SpeakingTest questions={questions} aiReady={await aiTextReady(user.id)} />;
}
