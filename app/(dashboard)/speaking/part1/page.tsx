import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { providerReady } from "@/lib/env";
import { SpeakingSessionRunner } from "@/components/speaking/session-runner";

export default async function SpeakingPart1Page() {
  const user = await requireUser();
  if (!user) return null;

  // Part 1 一次抽 3 题（不同 topic）
  const all = await prisma.speakingPrompt.findMany({ where: { part: 1, active: true } });
  const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 3);
  const prompts = shuffled.map((p) => ({
    id: p.id,
    part: 1 as const,
    topic: p.topic,
    question: p.question,
    followUps: p.followUps ? (JSON.parse(p.followUps) as string[]) : null,
  }));

  return (
    <SpeakingSessionRunner
      prompts={prompts}
      aiReady={providerReady("text")}
      voiceReady={providerReady("voice")}
    />
  );
}
