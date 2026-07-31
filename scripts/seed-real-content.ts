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
import { ensurePassage, type PassageInput, type QuestionInput } from "../lib/content/write";

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

const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"];
const YNG_OPTIONS = ["YES", "NO", "NOT GIVEN"];

/**
 * pools 里的题目 → study 模块的题目输入。
 * 只做内容变换（判分口径），序列化和主键由 lib/content/write 负责。
 */
function toQuestionRows(questions: PoolQ[]): QuestionInput[] {
  // 雅思 tfng 有两套按钮：信息类 TRUE/FALSE/NOT GIVEN vs 观点类 YES/NO/NOT GIVEN。
  // 单篇内不混用（已核验），故按整篇判定：出现 YES/NO 即整篇用 YNG。
  const tfngIsYNG = questions.some(
    (q) => q.type === "tfng" && (q.answer === "YES" || q.answer === "NO"),
  );
  return questions.map((q, idx) => {
    let options: string[] | null = null;
    let answer: unknown;
    if (q.type === "mcq" && q.options) {
      // study 模块 mcq 按字母判分：答案 = 正确选项的字母
      // IN EITHER ORDER 题(accept 列了兄弟选项)转成字母数组,任一字母都算对
      const toLetter = (v: string) => {
        const pos = q.options!.indexOf(v);
        return pos >= 0 ? LETTERS[pos] : v;
      };
      const letters = [q.answer, ...(q.accept ?? [])].map(toLetter);
      options = q.options;
      answer = letters.length > 1 ? letters : letters[0];
    } else if (q.type === "gapfill") {
      const all = [q.answer, ...(q.accept ?? [])];
      answer = all.length > 1 ? all : q.answer;
    } else {
      // tfng：把正确按钮集存进 options，答题页据此渲染（不泄漏答案）
      options = tfngIsYNG ? YNG_OPTIONS : TFNG_OPTIONS;
      answer = q.answer;
    }
    return { index: idx + 1, type: q.type as string, prompt: q.prompt, options, answer };
  });
}

type CambridgeReading = { id: string; title: string; content: string; questions: PoolQ[] };
type CambridgeListening = { id: string; title: string; intro: string; questions: PoolQ[] };
type VoaArticle = { id: string; title: string; text: string; questions: PoolQ[] };

const wordsIn = (text: string) => text.split(/\s+/).length;

/**
 * 四批内容，各自声明「怎么映射成一篇 passage」。
 * 注意 VOA 同一篇文章会进两次：阅读版（voa:）和听力版（voa-listen:），
 * source 前缀不同，因此 id 也不同，互不覆盖。
 */
const BATCHES: { label: string; passages: PassageInput[] }[] = [
  {
    label: "剑桥阅读",
    passages: (cambridgeReading as CambridgeReading[]).map((s) => ({
      source: `cambridge:${s.id}`,
      module: "reading",
      title: s.title,
      content: s.content,
      metadata: { difficulty: 7, wordCount: wordsIn(s.content), topics: ["剑桥真题"] },
      questions: toQuestionRows(s.questions),
    })),
  },
  {
    label: "VOA 阅读",
    passages: (voaArticles as VoaArticle[]).map((a) => ({
      source: `voa:${a.id}`,
      module: "reading",
      title: a.title,
      content: a.text,
      metadata: { difficulty: 6, wordCount: wordsIn(a.text), topics: ["VOA"] },
      questions: toQuestionRows(a.questions),
    })),
  },
  {
    label: "剑桥听力",
    passages: (cambridgeListening as CambridgeListening[]).map((s) => ({
      source: `cambridge:${s.id}`,
      module: "listening",
      title: s.title,
      content: s.intro,
      audioPath: `/audio/listening/${s.id}.m4a`,
      metadata: { difficulty: 7, wordCount: 0, topics: ["剑桥真题"] },
      questions: toQuestionRows(s.questions),
    })),
  },
  {
    label: "VOA 听力",
    passages: (voaArticles as VoaArticle[]).map((a) => ({
      source: `voa-listen:${a.id}`,
      module: "listening",
      title: a.title,
      content: a.text,
      audioPath: `/audio/listening/voa-${a.id}.m4a`,
      metadata: { difficulty: 6, wordCount: 0, topics: ["VOA"] },
      questions: toQuestionRows(a.questions),
    })),
  },
];

async function main() {
  let created = 0;

  for (const batch of BATCHES) {
    let n = 0;
    for (const p of batch.passages) {
      if ((await ensurePassage(prisma, p)) === "created") n++;
    }
    created += n;
    console.log(`  ${batch.label}: 新增 ${n}/${batch.passages.length}`);
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
