/**
 * 阅读题库 seed 脚本
 * 用法：./scripts/db.sh seed 或 tsx scripts/seed-passages.ts
 */
import { PrismaClient } from "@prisma/client";
import { ALL_SEED_PASSAGES } from "../lib/reading/seed-passages";
import { ensurePassage, tally, type Outcome } from "../lib/content/write";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 阅读题库 seed 开始...");

  const outcomes: Outcome[] = [];
  for (const sp of ALL_SEED_PASSAGES) {
    const outcome = await ensurePassage(prisma, {
      source: sp.source,
      module: "reading",
      title: sp.title,
      content: sp.content,
      metadata: sp.metadata,
      questions: sp.questions,
    });
    outcomes.push(outcome);
    if (outcome === "created") console.log(`  ✓ ${sp.title} (${sp.questions.length} 题)`);
  }
  const { created, skipped } = tally(outcomes);

  const total = await prisma.passage.count({ where: { module: "reading" } });
  const qc = await prisma.question.count();
  console.log(`✅ 新增 ${created}，跳过 ${skipped}，阅读 passage 共 ${total} 篇 · ${qc} 题`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
