/**
 * 听力题库 seed 脚本
 * 用法：tsx scripts/seed-listening.ts
 */
import { PrismaClient } from "@prisma/client";
import { ALL_LISTENING } from "../lib/listening/seed-scripts";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 听力题库 seed 开始...");
  let created = 0, skipped = 0;

  for (const l of ALL_LISTENING) {
    const existing = await prisma.passage.findFirst({ where: { source: l.source } });
    if (existing) { skipped++; continue; }

    await prisma.passage.create({
      data: {
        source: l.source,
        module: "listening",
        title: l.title,
        content: l.transcript,
        metadata: JSON.stringify({ ...l.metadata, section: l.section }),
        questions: {
          create: l.questions.map((q) => ({
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
    console.log(`  ✓ ${l.title} (${l.questions.length} 题)`);
  }

  const total = await prisma.passage.count({ where: { module: "listening" } });
  const qc = await prisma.question.count({ where: { passage: { module: "listening" } } });
  console.log(`✅ 新增 ${created}，跳过 ${skipped}。当前听力：${total} 篇 · ${qc} 题`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
