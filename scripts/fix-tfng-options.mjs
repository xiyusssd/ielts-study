// 一次性:给现有 DB 的 tfng 题回填正确按钮集(TRUE/FALSE vs YES/NO)。
// 单篇不混用两套(已核验),按整篇判定:出现 YES/NO 即整篇 YNG。
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const TFNG = JSON.stringify(["TRUE", "FALSE", "NOT GIVEN"]);
const YNG = JSON.stringify(["YES", "NO", "NOT GIVEN"]);

const passages = await prisma.passage.findMany({
  where: { module: "reading" },
  include: { questions: true },
});

let touched = 0;
for (const p of passages) {
  const tfng = p.questions.filter((q) => q.type === "tfng");
  if (!tfng.length) continue;
  const isYNG = tfng.some((q) => {
    const a = JSON.parse(q.answer);
    const v = Array.isArray(a) ? a[0] : a;
    return v === "YES" || v === "NO";
  });
  const opts = isYNG ? YNG : TFNG;
  for (const q of tfng) {
    if (q.options === opts) continue;
    await prisma.question.update({ where: { id: q.id }, data: { options: opts } });
    touched++;
  }
}
console.log(`✅ 回填 tfng options: ${touched} 题`);
await prisma.$disconnect();
