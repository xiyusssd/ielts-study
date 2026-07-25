import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { providerReady } from "@/lib/env";
import { SpeakingSessionRunner } from "@/components/speaking/session-runner";

export default async function SpeakingPart2Page() {
  const user = await requireUser();
  if (!user) return null;

  const all = await prisma.speakingPrompt.findMany({ where: { part: 2, active: true } });
  const picked = all[Math.floor(Math.random() * all.length)];
  const prompts = [{
    id: picked.id,
    part: 2 as const,
    topic: picked.topic,
    question: picked.question,
    followUps: picked.followUps ? (JSON.parse(picked.followUps) as string[]) : null,
  }];

  return <SpeakingSessionRunner prompts={prompts} aiReady={providerReady("text")} />;
}
