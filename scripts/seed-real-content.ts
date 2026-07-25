/**
 * 把剑桥真题 + VOA 内容 seed 进 Passage/Question 表，供「阅读/听力」日常练习模块使用。
 * （评估 /assessment 走 pools 直接读；此脚本让 study 模块也能用上真实内容）
 * MCQ 答案转成字母(study 模块按字母判分)；gapfill 保留文本+备选。
 * 幂等：按 source 去重。
 *
 * 用法：PATH=~/.local/node22/bin:$PATH DATABASE_URL=... tsx scripts/seed-real-content.ts
 */
import { PrismaClient } from "@prisma/client";
import cambridgeReading from "../lib/assessment/data/cambridge-reading.json";
import cambridgeListening from "../lib/assessment/data/cambridge-listening.json";
import voaArticles from "../lib/assessment/data/voa-articles.json";

const prisma = new PrismaClient();

type PoolQ = {
  id: string;
  type: "tfng" | "mcq" | "gapfill";
  prompt: string;
  options?: string[];
  answer: string;
  accept?: string[];
};

const LETTERS = "ABCDEFGHIJ";

/** 转成 study 模块 Question 行 */
function toQuestionRows(questions: PoolQ[]) {
  return questions.map((q, idx) => {
    let type = q.type as string;
    let options: string | null = null;
    let answer: string;
    if (q.type === "mcq" && q.options) {
      // study 模块 mcq 按字母判分：答案 = 正确选项的字母
      const pos = q.options.indexOf(q.answer);
      options = JSON.stringify(q.options);
      answer = JSON.stringify(pos >= 0 ? LETTERS[pos] : q.answer);
    } else if (q.type === "gapfill") {
      const all = [q.answer, ...(q.accept ?? [])];
      answer = JSON.stringify(all.length > 1 ? all : q.answer);
    } else {
      // tfng
      answer = JSON.stringify(q.answer);
    }
    return {
      index: idx + 1,
      type,
      prompt: q.prompt,
      options,
      answer,
      explanation: null as string | null,
    };
  });
}

async function upsertPassage(opts: {
  source: string;
  module: string;
  title: string;
  content: string;
  metadata: object;
  audioPath?: string | null;
  questions: PoolQ[];
}) {
  const existing = await prisma.passage.findFirst({ where: { source: opts.source } });
  if (existing) return false;
  await prisma.passage.create({
    data: {
      source: opts.source,
      module: opts.module,
      title: opts.title,
      content: opts.content,
      audioPath: opts.audioPath ?? null,
      metadata: JSON.stringify(opts.metadata),
      questions: { create: toQuestionRows(opts.questions) },
    },
  });
  return true;
}

async function main() {
  let created = 0;

  // 1. 剑桥阅读 12 篇
  for (const s of cambridgeReading as { id: string; title: string; content: string; questions: PoolQ[] }[]) {
    const ok = await upsertPassage({
      source: `cambridge:${s.id}`,
      module: "reading",
      title: s.title,
      content: s.content,
      metadata: { difficulty: 7, wordCount: s.content.split(/\s+/).length, topics: ["剑桥真题"] },
      questions: s.questions,
    });
    if (ok) created++;
  }

  // 2. VOA 阅读 6 篇
  for (const a of voaArticles as { id: string; title: string; text: string; questions: PoolQ[] }[]) {
    const ok = await upsertPassage({
      source: `voa:${a.id}`,
      module: "reading",
      title: a.title,
      content: a.text,
      metadata: { difficulty: 6, wordCount: a.text.split(/\s+/).length, topics: ["VOA"] },
      questions: a.questions,
    });
    if (ok) created++;
  }

  // 3. 剑桥听力 4 套(真人音频)
  for (const s of cambridgeListening as { id: string; title: string; intro: string; questions: PoolQ[] }[]) {
    const ok = await upsertPassage({
      source: `cambridge:${s.id}`,
      module: "listening",
      title: s.title,
      content: s.intro,
      audioPath: `/audio/listening/${s.id}.m4a`,
      metadata: { difficulty: 7, wordCount: 0, topics: ["剑桥真题"] },
      questions: s.questions,
    });
    if (ok) created++;
  }

  // 4. VOA 听力 6 篇(真人音频)
  for (const a of voaArticles as { id: string; title: string; text: string; questions: PoolQ[] }[]) {
    const ok = await upsertPassage({
      source: `voa-listen:${a.id}`,
      module: "listening",
      title: a.title,
      content: a.text,
      audioPath: `/audio/listening/voa-${a.id}.m4a`,
      metadata: { difficulty: 6, wordCount: 0, topics: ["VOA"] },
      questions: a.questions,
    });
    if (ok) created++;
  }

  const r = await prisma.passage.count({ where: { module: "reading" } });
  const l = await prisma.passage.count({ where: { module: "listening" } });
  console.log(`✅ 新增 ${created} · 阅读题库共 ${r} 篇 · 听力题库共 ${l} 篇`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
