/**
 * 从 vocab-bank.json 灌满背单词复习库（DB Word 表）。
 *
 * 选词：优先考试词(ielts/cet6/cet4/toefl)，按 COCA 词频排序，取前 LIMIT 个。
 * tags 存三维分类（可查询）：来源裸 token + 话题前缀 t: + 难度前缀 cefr:
 *   例 "ielts,cet6,awl,t:environment,t:nature,cefr:B2"
 * translations 用 [{pos, meaning}]；examples 暂空（ECDICT 无例句，后续可补）。
 *
 * 用法：tsx scripts/seed-words-from-bank.ts [LIMIT]
 */
import { PrismaClient } from "@prisma/client";
import bank from "../lib/assessment/data/vocab-bank.json";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type BankWord = {
  word: string; ipa: string | null; meaning: string;
  pos: string | null; cefr: string | null; level: number;
  freq: number; sources: string[]; topics: string[];
};

const LIMIT = Number(process.argv[2] ?? 5000);
const PRIORITY = ["ielts", "cet6", "cet4", "toefl"];

function buildTags(w: BankWord): string {
  const tokens = [...w.sources];
  for (const t of w.topics) tokens.push(`t:${t}`);
  if (w.cefr) tokens.push(`cefr:${w.cefr}`);
  return tokens.join(",");
}

function selectWords(words: BankWord[]): BankWord[] {
  // 优先级分数：命中优先来源越多越靠前；其次按频率(小=高频=靠前)
  const scored = words.map((w) => {
    const prio = PRIORITY.reduce((n, s) => n + (w.sources.includes(s) ? 1 : 0), 0);
    return { w, prio, freq: w.freq > 0 ? w.freq : 1e9 };
  });
  scored.sort((a, b) => (b.prio - a.prio) || (a.freq - b.freq));
  return scored.slice(0, LIMIT).map((s) => s.w);
}

async function main() {
  console.log(`🌱 从 vocab-bank 灌复习库（上限 ${LIMIT}）...`);
  const words = bank as BankWord[];
  const picked = selectWords(words);

  let created = 0, updated = 0;
  const CHUNK = 500;
  for (let i = 0; i < picked.length; i += CHUNK) {
    const batch = picked.slice(i, i + CHUNK);
    await prisma.$transaction(
      batch.map((w) =>
        prisma.word.upsert({
          where: { spelling: w.word },
          create: {
            spelling: w.word,
            ipa: w.ipa,
            translations: JSON.stringify([{ pos: w.pos ?? "", meaning: w.meaning }]),
            examples: JSON.stringify([]),
            level: w.level,
            tags: buildTags(w),
          },
          update: {
            ipa: w.ipa,
            translations: JSON.stringify([{ pos: w.pos ?? "", meaning: w.meaning }]),
            level: w.level,
            tags: buildTags(w),
          },
        }),
      ),
    );
    created += batch.length;
    process.stdout.write(`\r  已处理 ${Math.min(i + CHUNK, picked.length)}/${picked.length}`);
  }
  console.log("");

  const total = await prisma.word.count();
  const withTopic = await prisma.word.count({ where: { tags: { contains: "t:" } } });
  const ielts = await prisma.word.count({ where: { tags: { contains: "ielts" } } });
  console.log(`✅ 灌入 ${picked.length} 词，DB 现有 ${total} 词`);
  console.log(`   含话题标签 ${withTopic} · ielts 标签 ${ielts}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
