/**
 * 词表 seed 脚本 — 从 lib/vocab/seed-words.ts 导入到 DB
 * 使用：./scripts/db.sh seed-words （或直接 tsx scripts/seed-words.ts）
 */

import { PrismaClient } from "@prisma/client";
import { SEED_WORDS } from "../lib/vocab/seed-words";
import { ensureWord, tally, type Outcome } from "../lib/content/write";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 词表 seed 开始...");

  const outcomes: Outcome[] = [];
  for (const w of SEED_WORDS) {
    outcomes.push(
      await ensureWord(prisma, {
        spelling: w.spelling,
        ipa: w.ipa,
        translations: w.translations,
        examples: w.examples,
        level: w.level,
        tags: (w.tags ?? []).join(","),
      }),
    );
  }
  const { created, updated } = tally(outcomes);

  const total = await prisma.word.count();
  const byLevel = await prisma.$queryRawUnsafe(
    `SELECT level, COUNT(*) as c FROM Word GROUP BY level ORDER BY level`,
  );
  console.log(`✅ 新增 ${created}，更新 ${updated}，DB 中共 ${total} 词`);
  console.log("   按等级分布：", byLevel);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
