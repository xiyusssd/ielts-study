/**
 * 口语题库 seed
 * 用法：tsx scripts/seed-speaking.ts
 */
import { PrismaClient } from "@prisma/client";
import { SPEAKING_PROMPTS } from "../lib/speaking/seed-prompts";
import { ensureSpeakingPrompt, tally, type Outcome } from "../lib/content/write";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 口语题库 seed 开始...");

  const outcomes: Outcome[] = [];
  for (const p of SPEAKING_PROMPTS) {
    outcomes.push(await ensureSpeakingPrompt(prisma, p));
  }
  const { created, skipped } = tally(outcomes);

  const [p1, p2, p3] = await Promise.all([
    prisma.speakingPrompt.count({ where: { part: 1 } }),
    prisma.speakingPrompt.count({ where: { part: 2 } }),
    prisma.speakingPrompt.count({ where: { part: 3 } }),
  ]);
  console.log(`✅ 新增 ${created}，跳过 ${skipped}。P1: ${p1} · P2: ${p2} · P3: ${p3}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
