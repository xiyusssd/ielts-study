/**
 * 剑桥真题词书挖掘 + 官方词书 seed。
 *
 * 从 Passage 表统计词频（只统计真实剑桥真题 cambridge:*，不含 seed-* 示例），生成：
 *   1. 雅思真题词书 (ielts-reading)：每篇阅读 Passage 一章，章内取考频最高的词
 *   2. 听力高频词书 (ielts-listening)：每套听力 (cNN-tN) 一章，章内取高频词
 *   3. Word.freq 回填：全真题总考频（阅读 + 听力）
 *
 * 幂等：官方词书按 slug upsert，章节与词条全量重建（官方词书是纯内容表，
 * 无用户数据外键，重建安全）。
 *
 * 使用：pnpm build:book-vocab（或 ./scripts/db.sh 之外直接 tsx scripts/build-book-vocab.ts）
 * 前置：先 seed 词库与 Passage（seed-words / seed-passages / seed-listening）。
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============ 配置 ============

const READING_BOOK = {
  slug: "ielts-reading",
  title: "剑桥真题词书",
  description: "从剑桥雅思真题阅读篇章统计的考频词，按篇分章，优先学你最常遇到的词。",
};

const LISTENING_BOOK = {
  slug: "ielts-listening",
  title: "听力高频词书",
  description: "从剑桥雅思真题听力原文统计的高频词，按套分章。",
};

/** 每章保留的最高频词数（阅读 / 听力） */
const CHAPTER_SIZE = { reading: 40, listening: 30 } as const;
/** 单章内最低出现次数，低于则不收（避免噪音） */
const MIN_FREQ = 2;
/** 听力答案词的加权：答案词是听写目标，出现 1 次也值得收 */
const ANSWER_WEIGHT = 3;
/** 词最短长度 */
const MIN_LEN = 3;

/** 英语停用词。真题里满篇都是这些词，统计考频毫无意义。 */
const STOPWORDS = new Set(
  (
    "the be to of and a in that have i it for not on with he as you do at this but his by " +
    "from they we say her she or an will my one all would there their what so up out if about " +
    "who get which go me when make can like time no just him know take people into year your " +
    "good some could them see other than then now look only come its over think also back after " +
    "use two how our work first well way even new want because any these give day most us is " +
    "are was were been has had did does doing done being am s t d ll ve re m don aren wasn " +
    "isn't hasn't couldn't shouldn't wouldn't doesn't didn't won't can't let's that's it's he's " +
    "she's they're we're you're i'm here's there's what's who's where's when's why's how's"
  ).split(/\s+/),
);

// ============ 工具 ============

/** 分词计数：全部小写，按连续字母切，过滤停用词/短词。 */
function countTokens(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    if (m.length < MIN_LEN || STOPWORDS.has(m)) continue;
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return counts;
}

/** 累加计数：words 追加进 counts，带权重。 */
function addCounts(counts: Map<string, number>, words: Iterable<string>, weight = 1) {
  for (const s of words) counts.set(s, (counts.get(s) ?? 0) + weight);
}

/** 解析题目 answer 字段（JSON 字符串/数组/对象），抽出全部单词。 */
function answerTokens(answerJson: string): string[] {
  try {
    const parsed = JSON.parse(answerJson) as unknown;
    const parts = Array.isArray(parsed) ? parsed : [parsed];
    return parts.flatMap((p) => {
      if (typeof p !== "string" && typeof p !== "number") return [];
      return String(p).toLowerCase().match(/[a-z]+/g) ?? [];
    });
  } catch {
    return [];
  }
}

/** source 如 cambridge:c13-t1-p1 → 章节标题「剑13 · Test 1 · Passage 1」；听力 c13-t1-s4 → 「剑13 · Test 1」 */
function chapterTitle(source: string, isListening: boolean): string {
  const m = source.match(/^cambridge:c(\d+)-t(\d+)-(p|s)(\d+)$/);
  if (!m) return source;
  const [, c, t, kind, n] = m;
  if (isListening) return `剑${c} · Test ${t}`;
  return `剑${c} · Test ${t} · Passage ${n}`;
}

/** 听力 source 的套键：cambridge:c13-t1-s4 → cambridge:c13-t1 */
function testKey(source: string): string {
  const m = source.match(/^(cambridge:c\d+-t\d+)-s\d+$/);
  return m ? m[1] : source;
}

/** 官方词书/章节/词条 id 全部确定性推导，重复 seed 得到同一 id。 */
const bookId = (slug: string) => `wb~${slug}`;
const chapterId = (slug: string, index: number) => `wc~${slug}~${String(index).padStart(3, "0")}`;

// ============ 主流程 ============

async function main() {
  console.log("📚 真题词书挖掘开始...");

  const [passages, words, questions] = await Promise.all([
    prisma.passage.findMany({
      where: { source: { startsWith: "cambridge:" }, active: true },
      select: { id: true, source: true, module: true, title: true, content: true },
    }),
    prisma.word.findMany({ select: { id: true, spelling: true } }),
    prisma.question.findMany({ select: { passageId: true, prompt: true, answer: true } }),
  ]);

  const reading = passages.filter((p) => p.module === "reading");
  const listening = passages.filter((p) => p.module === "listening");
  console.log(`  阅读 ${reading.length} 篇 / 听力 ${listening.length} 段 / 词库 ${words.length} 词`);

  const wordIdBySpelling = new Map(words.map((w) => [w.spelling, w.id]));
  const globalFreq = new Map<string, number>(); // wordId → 全真题总考频

  // 按篇/按段统计，只有词库里的词才收入（否则学了没释义）
  type ChapterStat = {
    source: string;
    title: string;
    top: { wordId: string; spelling: string; freq: number }[];
  };

  const statChapter = (p: (typeof passages)[number], isListening: boolean): ChapterStat => {
    const counts = countTokens(p.content);
    const top: { wordId: string; spelling: string; freq: number }[] = [];
    for (const [spelling, freq] of counts) {
      const wordId = wordIdBySpelling.get(spelling);
      if (!wordId) continue; // 不在词库 → 不进词书，但仍计入全真题考频
      globalFreq.set(wordId, (globalFreq.get(wordId) ?? 0) + freq);
      top.push({ wordId, spelling, freq });
    }
    top.sort((a, b) => b.freq - a.freq || a.spelling.localeCompare(b.spelling));
    return {
      source: p.source,
      title: chapterTitle(p.source, isListening),
      top: top.filter((t) => t.freq >= MIN_FREQ).slice(0, CHAPTER_SIZE[isListening ? "listening" : "reading"]),
    };
  };

  const readingChapters = reading.map((p) => statChapter(p, false));

  // 听力：剑桥听力没有转录文本（版权），题干 + 答案词才是可挖的语料。
  // 答案词是听写目标，加权 ANSWER_WEIGHT；题干高频词作补充。
  const listeningChapters: ChapterStat[] = [];
  const byTest = new Map<string, { passages: typeof listening; questions: typeof questions }>();
  const passageIds = new Set(listening.map((p) => p.id));
  const listeningQuestions = questions.filter((q) => passageIds.has(q.passageId));
  for (const p of listening) {
    const key = testKey(p.source);
    const entry = byTest.get(key) ?? { passages: [], questions: [] };
    entry.passages.push(p);
    byTest.set(key, entry);
  }
  for (const q of listeningQuestions) {
    const p = listening.find((x) => x.id === q.passageId);
    if (!p) continue;
    byTest.get(testKey(p.source))?.questions.push(q);
  }
  for (const [key, { passages: ps, questions: qs }] of byTest) {
    const counts = new Map<string, number>();
    for (const p of ps) for (const [s, f] of countTokens(p.content)) counts.set(s, (counts.get(s) ?? 0) + f);
    for (const q of qs) {
      addCounts(counts, countTokens(q.prompt).keys());
      // 答案词先过一遍长度/停用词过滤再加权
      const answers = answerTokens(q.answer).filter((a) => a.length >= MIN_LEN && !STOPWORDS.has(a));
      addCounts(counts, answers, ANSWER_WEIGHT);
    }
    const top: { wordId: string; spelling: string; freq: number }[] = [];
    for (const [spelling, freq] of counts) {
      const wordId = wordIdBySpelling.get(spelling);
      if (!wordId) continue;
      globalFreq.set(wordId, (globalFreq.get(wordId) ?? 0) + freq);
      top.push({ wordId, spelling, freq });
    }
    top.sort((a, b) => b.freq - a.freq || a.spelling.localeCompare(b.spelling));
    listeningChapters.push({
      source: key,
      title: chapterTitle(`${key}-s4`, true),
      top: top.slice(0, CHAPTER_SIZE.listening),
    });
  }
  listeningChapters.sort((a, b) => a.source.localeCompare(b.source));

  // ============ 落库 ============
  await prisma.$transaction(async (tx) => {
    // 官方词书 upsert + 章节重建
    for (const [spec, chapters] of [
      [READING_BOOK, readingChapters],
      [LISTENING_BOOK, listeningChapters],
    ] as const) {
      await tx.wordBook.upsert({
        where: { slug: spec.slug },
        create: { id: bookId(spec.slug), slug: spec.slug, title: spec.title, description: spec.description, kind: "official" },
        update: { title: spec.title, description: spec.description },
      });

      const existing = await tx.wordChapter.findMany({ where: { bookId: bookId(spec.slug) }, select: { id: true } });
      if (existing.length) {
        await tx.chapterWord.deleteMany({ where: { chapterId: { in: existing.map((c) => c.id) } } });
        await tx.wordChapter.deleteMany({ where: { bookId: bookId(spec.slug) } });
      }

      let wordTotal = 0;
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        if (ch.top.length === 0) continue;
        const chId = chapterId(spec.slug, i);
        await tx.wordChapter.create({
          data: { id: chId, bookId: bookId(spec.slug), index: i, title: ch.title, subtitle: ch.source },
        });
        await tx.chapterWord.createMany({
          data: ch.top.map((t, wi) => ({ id: `${chId}~${wi}`, chapterId: chId, wordId: t.wordId, index: wi, freq: t.freq })),
        });
        wordTotal += ch.top.length;
      }
      console.log(`  ✓ ${spec.slug}：${chapters.length} 章 / ${wordTotal} 词条`);
    }
  });

  // Word.freq 回填（只更新有考频的，其余保持原值）
  const entries = [...globalFreq.entries()];
  let updated = 0;
  for (let i = 0; i < entries.length; i += 500) {
    const chunk = entries.slice(i, i + 500);
    await prisma.$transaction(
      chunk.map(([wordId, freq]) => prisma.word.update({ where: { id: wordId }, data: { freq } })),
    );
    updated += chunk.length;
  }
  console.log(`  ✓ Word.freq 回填 ${updated} 词`);

  const summary = await prisma.wordBook.findMany({
    where: { kind: "official" },
    select: { slug: true, title: true, _count: { select: { chapters: true } } },
  });
  console.log("✅ 官方词书：", summary.map((b) => `${b.title}(${b._count.chapters} 章)`).join(" / "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });