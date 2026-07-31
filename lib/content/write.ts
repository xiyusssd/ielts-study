/**
 * 内容入库的唯一出口。
 *
 * 为什么存在：6 个 seed 脚本原本各自手写「按自然键查重 → create」，
 * 其中 4 份还重复同一段 questions 字段映射。结果是：
 *   - 主键怎么来这件事散落在 6 处，改一次要改 6 个文件
 *   - 查重键各写各的（有的按 source，有的按 prompt 前 50 字符）
 *   - seed-speaking 干脆 deleteMany 全表重灌，id 每次全换
 *
 * 现在职责收拢：seed 脚本只声明「内容是什么」，本模块决定「怎么落库」。
 * 主键一律取自 contentId，同一份内容重复 seed 得到同一个 id，
 * 于是 VocabProgress.wordId / Attempt.questionId 之类外键天然稳定。
 *
 * 边界：只负责内容表（Word/Passage/Question/WritingPrompt/SpeakingPrompt）。
 * 用户数据表不在此处出现，本模块也不含任何删除操作。
 */
import type { PrismaClient } from "@prisma/client";
import { contentId } from "./id";

/** 落库结果。seed 脚本据此计数，不必自己判断发生了什么。 */
export type Outcome = "created" | "updated" | "skipped";

/** JSON 列统一在这里序列化，seed 脚本不再各自 stringify。 */
const json = (v: unknown): string => JSON.stringify(v ?? null);

// ============ 题目 ============

/**
 * 题目输入。answer/options 传结构化值，序列化由本模块负责。
 *
 * options 有两种形态：选择题是选项数组，配对题（heading/matching）是
 * 编号→选项的对象映射。两者都直接 JSON 化，判分侧按 type 解读。
 */
export type QuestionInput = {
  index: number;
  type: string;
  prompt: string;
  options?: string[] | Record<string, string> | null;
  answer: unknown;
  explanation?: string | null;
};

/**
 * 题目行 = 输入 + 确定性 id。
 * id 依赖所属篇目，所以必须由 passageId 推导，不能单独算。
 */
const questionRows = (passageId: string, questions: QuestionInput[]) =>
  questions.map((q) => ({
    id: contentId.question(passageId, q.index),
    index: q.index,
    type: q.type,
    prompt: q.prompt,
    options: q.options ? json(q.options) : null,
    answer: json(q.answer),
    explanation: q.explanation ?? null,
  }));

// ============ 篇目（阅读/听力） ============

export type PassageInput = {
  source: string;
  module: string;
  title: string;
  content: string;
  metadata: object;
  audioPath?: string | null;
  questions: QuestionInput[];
};

/**
 * 篇目按 source 幂等。已存在则原样保留 —— 老数据的 cuid 主键和指向它的
 * 练习记录都不动，这是「只对新写入生效」的边界所在。
 */
export const ensurePassage = async (
  db: PrismaClient,
  p: PassageInput,
): Promise<Outcome> => {
  const existing = await db.passage.findFirst({
    where: { source: p.source },
    select: { id: true },
  });
  if (existing) return "skipped";

  const id = contentId.passage(p.source);
  await db.passage.create({
    data: {
      id,
      source: p.source,
      module: p.module,
      title: p.title,
      content: p.content,
      audioPath: p.audioPath ?? null,
      metadata: json(p.metadata),
      questions: { create: questionRows(id, p.questions) },
    },
  });
  return "created";
};

// ============ 词条 ============

export type WordInput = {
  spelling: string;
  ipa?: string | null;
  translations: unknown;
  examples?: unknown;
  level: number;
  tags: string;
};

/**
 * 词条 upsert 参数。单独暴露是为了让批量 seed 能塞进一个 $transaction，
 * 5000 词逐条 await 太慢。
 *
 * examples 只在创建时写：AI 生成的例句后来可能被补充进去，
 * 重跑 seed 不该把它覆盖成空数组。
 */
export const wordUpsertArgs = (w: WordInput) => ({
  where: { spelling: w.spelling },
  create: {
    id: contentId.word(w.spelling),
    spelling: w.spelling,
    ipa: w.ipa ?? null,
    translations: json(w.translations),
    examples: json(w.examples ?? []),
    level: w.level,
    tags: w.tags,
  },
  update: {
    ipa: w.ipa ?? null,
    translations: json(w.translations),
    level: w.level,
    tags: w.tags,
  },
});

export const ensureWord = async (db: PrismaClient, w: WordInput): Promise<Outcome> => {
  const existing = await db.word.findUnique({
    where: { spelling: w.spelling },
    select: { id: true },
  });
  await db.word.upsert(wordUpsertArgs(w));
  return existing ? "updated" : "created";
};

// ============ 写作题 ============

export type WritingPromptInput = {
  task: string;
  category: string;
  prompt: string;
  imageUrl?: string | null;
  minWords?: number;
  timeMinutes?: number;
};

/**
 * 写作题按 (task, prompt) 全文精确匹配去重。
 * 原实现用 prompt 前 50 字符 startsWith —— 两道同开头的题会被误判成重复。
 */
export const ensureWritingPrompt = async (
  db: PrismaClient,
  p: WritingPromptInput,
): Promise<Outcome> => {
  const existing = await db.writingPrompt.findFirst({
    where: { task: p.task, prompt: p.prompt },
    select: { id: true },
  });
  if (existing) return "skipped";

  await db.writingPrompt.create({
    data: {
      id: contentId.writingPrompt(p.task, p.prompt),
      task: p.task,
      category: p.category,
      prompt: p.prompt,
      imageUrl: p.imageUrl ?? null,
      ...(p.minWords === undefined ? {} : { minWords: p.minWords }),
      ...(p.timeMinutes === undefined ? {} : { timeMinutes: p.timeMinutes }),
    },
  });
  return "created";
};

// ============ 口语题 ============

export type SpeakingPromptInput = {
  part: number;
  topic: string;
  question: string;
  followUps?: string[] | null;
};

/**
 * 口语题按 (part, question) 去重。
 * 原实现是 deleteMany 全表再重灌，每次运行 id 全换，
 * 历史 SpeakingSession.promptIds 里记的题目引用随之失效。
 */
export const ensureSpeakingPrompt = async (
  db: PrismaClient,
  p: SpeakingPromptInput,
): Promise<Outcome> => {
  const existing = await db.speakingPrompt.findFirst({
    where: { part: p.part, question: p.question },
    select: { id: true },
  });
  if (existing) return "skipped";

  await db.speakingPrompt.create({
    data: {
      id: contentId.speakingPrompt(p.part, p.question),
      part: p.part,
      topic: p.topic,
      question: p.question,
      followUps: p.followUps ? json(p.followUps) : null,
    },
  });
  return "created";
};

// ============ 计数 ============

/** 把一串 Outcome 收成计数，供 seed 脚本打印。 */
export const tally = (outcomes: Outcome[]): Record<Outcome, number> =>
  outcomes.reduce(
    (acc, o) => ({ ...acc, [o]: acc[o] + 1 }),
    { created: 0, updated: 0, skipped: 0 } as Record<Outcome, number>,
  );