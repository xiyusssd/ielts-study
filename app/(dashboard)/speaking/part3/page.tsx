import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { providerReady } from "@/lib/env";
import { SpeakingSessionRunner } from "@/components/speaking/session-runner";

export default async function SpeakingPart3Page() {
  const user = await requireUser();
  if (!user) return null;

  const all = await prisma.speakingPrompt.findMany({ where: { part: 3, active: true } });
  const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 2);
  const prompts = shuffled.map((p) => ({
    id: p.id,
    part: 3 as const,
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
