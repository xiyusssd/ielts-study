/**
 * 写作题库 seed
 * 用法：tsx scripts/seed-writing.ts
 */
import { PrismaClient } from "@prisma/client";
import { WRITING_PROMPTS } from "../lib/writing/seed-prompts";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 写作题库 seed 开始...");
  let created = 0, skipped = 0;

  for (const p of WRITING_PROMPTS) {
    const existing = await prisma.writingPrompt.findFirst({
      where: { prompt: { startsWith: p.prompt.slice(0, 50) } },
    });
    if (existing) { skipped++; continue; }
    await prisma.writingPrompt.create({
      data: {
        task: p.task,
        category: p.category,
        prompt: p.prompt,
        minWords: p.minWords,
        timeMinutes: p.timeMinutes,
      },
    });
    created++;
  }

  const [t1, t2] = await Promise.all([
    prisma.writingPrompt.count({ where: { task: "task1" } }),
    prisma.writingPrompt.count({ where: { task: "task2" } }),
  ]);
  console.log(`✅ 新增 ${created}，跳过 ${skipped}。当前 Task 1: ${t1} 题，Task 2: ${t2} 题`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
