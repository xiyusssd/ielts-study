import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { aiTextReady } from "@/lib/ai/actions";
import { WritingTest } from "@/components/assessment/writing-test";

export const dynamic = "force-dynamic";

export default async function WritingAssessmentPage() {
  const user = await requireUser();
  if (!user) return null;
  // 从 DB 随机抽 1 道 Task 2 题
  const prompts = await prisma.writingPrompt.findMany({ where: { task: "task2", active: true } });
  const pick = prompts.length
    ? prompts[Math.floor(Math.random() * prompts.length)]
    : null;
  const content = pick?.prompt ?? "Some people think formal education is the most important factor in career success, while others believe practical experience matters more. Discuss both views and give your own opinion.";
  const minWords = pick?.minWords ?? 250;
  const minutes = pick?.timeMinutes ?? 40;
  return (
    <WritingTest prompt={content} minWords={minWords} minutes={minutes} aiReady={await aiTextReady(user.id)} />
  );
}
