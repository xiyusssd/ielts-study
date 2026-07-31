/**
 * 写作题库 seed
 * 用法：tsx scripts/seed-writing.ts
 */
import { PrismaClient } from "@prisma/client";
import { WRITING_PROMPTS } from "../lib/writing/seed-prompts";
import { ensureWritingPrompt, tally, type Outcome } from "../lib/content/write";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 写作题库 seed 开始...");

  const outcomes: Outcome[] = [];
  for (const p of WRITING_PROMPTS) {
    outcomes.push(await ensureWritingPrompt(prisma, p));
  }
  const { created, skipped } = tally(outcomes);

  const [t1, t2] = await Promise.all([
    prisma.writingPrompt.count({ where: { task: "task1" } }),
    prisma.writingPrompt.count({ where: { task: "task2" } }),
  ]);
  console.log(`✅ 新增 ${created}，跳过 ${skipped}。当前 Task 1: ${t1} 题，Task 2: ${t2} 题`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
