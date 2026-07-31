/**
 * 听力题库 seed 脚本
 * 用法：tsx scripts/seed-listening.ts
 */
import { PrismaClient } from "@prisma/client";
import { ALL_LISTENING } from "../lib/listening/seed-scripts";
import { ensurePassage, tally, type Outcome } from "../lib/content/write";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 听力题库 seed 开始...");

  const outcomes: Outcome[] = [];
  for (const l of ALL_LISTENING) {
    const outcome = await ensurePassage(prisma, {
      source: l.source,
      module: "listening",
      title: l.title,
      content: l.transcript,
      metadata: { ...l.metadata, section: l.section },
      questions: l.questions,
    });
    outcomes.push(outcome);
    if (outcome === "created") console.log(`  ✓ ${l.title} (${l.questions.length} 题)`);
  }
  const { created, skipped } = tally(outcomes);

  const total = await prisma.passage.count({ where: { module: "listening" } });
  const qc = await prisma.question.count({ where: { passage: { module: "listening" } } });
  console.log(`✅ 新增 ${created}，跳过 ${skipped}。当前听力：${total} 篇 · ${qc} 题`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
