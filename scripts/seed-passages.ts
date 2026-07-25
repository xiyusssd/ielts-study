/**
 * 阅读题库 seed 脚本
 * 用法：./scripts/db.sh seed 或 tsx scripts/seed-passages.ts
 */
import { PrismaClient } from "@prisma/client";
import { ALL_SEED_PASSAGES } from "../lib/reading/seed-passages";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 阅读题库 seed 开始...");

  let created = 0;
  let skipped = 0;

  for (const sp of ALL_SEED_PASSAGES) {
    const existing = await prisma.passage.findFirst({ where: { source: sp.source } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.passage.create({
      data: {
        source: sp.source,
        module: "reading",
        title: sp.title,
        content: sp.content,
        metadata: JSON.stringify(sp.metadata),
        questions: {
          create: sp.questions.map((q) => ({
            index: q.index,
            type: q.type,
            prompt: q.prompt,
            options: q.options ? JSON.stringify(q.options) : null,
            answer: JSON.stringify(q.answer),
            explanation: q.explanation ?? null,
          })),
        },
      },
    });
    created++;
    console.log(`  ✓ ${sp.title} (${sp.questions.length} 题)`);
  }

  const total = await prisma.passage.count({ where: { module: "reading" } });
  const qc = await prisma.question.count();
  console.log(`✅ 新增 ${created}，跳过 ${skipped}，阅读 passage 共 ${total} 篇 · ${qc} 题`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
