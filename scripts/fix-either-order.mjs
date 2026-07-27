// 一次性:给现有 DB 的 IN EITHER ORDER mcq 题回填字母数组答案。
// 源 JSON 里这类题 accept 列了兄弟选项;seed 旧逻辑丢弃了 accept,
// 导致 study DB 只认单字母,填反位置判 0 分。此脚本按源重算字母数组。
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const LETTERS = "ABCDEFGHIJ";

const src = JSON.parse(
  readFileSync("lib/assessment/data/cambridge-reading.json", "utf8"),
);

let touched = 0;
for (const p of src) {
  const dbP = await prisma.passage.findFirst({
    where: { source: `cambridge:${p.id}`, module: "reading" },
    include: { questions: { orderBy: { index: "asc" } } },
  });
  if (!dbP) continue;
  for (let i = 0; i < p.questions.length; i++) {
    const sq = p.questions[i];
    if (sq.type !== "mcq" || !sq.options || !sq.accept?.length) continue;
    const toLetter = (v) => {
      const pos = sq.options.indexOf(v);
      return pos >= 0 ? LETTERS[pos] : v;
    };
    const letters = [sq.answer, ...sq.accept].map(toLetter);
    const dbQ = dbP.questions[i];
    if (!dbQ) continue;
    const next = JSON.stringify(letters);
    if (dbQ.answer !== next) {
      await prisma.question.update({ where: { id: dbQ.id }, data: { answer: next } });
      touched++;
    }
  }
}
console.log(`✅ 回填 IN EITHER ORDER 答案: ${touched} 题`);
await prisma.$disconnect();
