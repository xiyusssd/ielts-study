/**
 * 用 AI 生成 1 篇阅读并入库。
 * 用法：./scripts/db.sh gen-reading  或  tsx scripts/gen-reading.ts [targetBand] [topic]
 */
import { PrismaClient } from "@prisma/client";
import { generateReadingPassage } from "../lib/ai/content-gen";

const prisma = new PrismaClient();

async function main() {
  const targetBand = Number(process.argv[2] ?? 6.5);
  const topic = process.argv[3];

  console.log(`🤖 生成阅读题目 (Band ${targetBand}${topic ? `, ${topic}` : ""})...`);
  const gen = await generateReadingPassage({ targetBand, topic });
  console.log(`  ✓ ${gen.title} — ${gen.questions.length} 题`);

  const source = `ai-${Date.now()}`;
  await prisma.passage.create({
    data: {
      source,
      module: "reading",
      title: gen.title,
      content: gen.content,
      metadata: JSON.stringify({
        difficulty: targetBand,
        wordCount: gen.content.split(/\s+/).length,
        topics: gen.topics,
        aiGenerated: true,
      }),
      questions: {
        create: gen.questions.map((q) => ({
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
  console.log(`✅ 已入库 (source=${source})`);
}

main()
  .catch((e) => { console.error("❌", e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
