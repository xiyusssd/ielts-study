/**
 * 内容表主键的唯一构造入口。
 *
 * 为什么存在：内容表主键原本是 cuid() 随机值，每次重新 seed 就换一整套 id，
 * 导致 VocabProgress.wordId / Attempt.questionId 之类外键集体悬空。
 * 历史上的「解法」是同步时 DELETE 掉这些进度表 —— 用户练习记录因此被反复清零。
 *
 * 现在 id 由内容的自然键决定：同一份内容永远算出同一个 id。
 * 于是「重新 seed」退化成 upsert，外键天然稳定，无需任何删除或重映射。
 *
 * 约束：
 *   - 单射：不同内容不得算出同一 id（自然键唯一性已在库中验证）
 *   - URL 安全：id 会直接进路由段 /reading/[passageId]，必须 percent-encoding 后仍等于自身，
 *     否则 params 拿到的是 %XX 形态、findUnique 匹配不上（曾因此 404，见 segment() 注释）
 *   - 纯函数：不依赖 node:crypto，可在任意运行时求值
 */

/** FNV-1a 32 位。纯函数、无依赖，够用于内容去重（非密码学用途）。 */
const fnv1a = (input: string, seed = 0x811c9dc5): number => {
  let h = seed;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // h *= 16777619，用移位避免 32 位溢出精度问题
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h >>> 0;
};

/** 拼成 16 位十六进制：两个不同种子的 FNV 串联，把碰撞概率压到可忽略。 */
const hash16 = (...parts: string[]): string => {
  const s = parts.join("\u0000"); // NUL 分隔，避免 ("ab","c") 与 ("a","bc") 撞车
  const a = fnv1a(s, 0x811c9dc5);
  const b = fnv1a(s, 0x01000193);
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
};

/**
 * 层级分隔符。
 *
 * 为什么不是 ":"：Next.js 会把动态段里的 ":" 保留为 %3A 交给 params，
 * 于是 findUnique({ id: "cambridge%3Ac13-t1-p1" }) 必然落空。
 * "~" 是 RFC 3986 unreserved 字符，实测原样透传（":" → %3A，"~" → "~"）。
 */
const SEP = "~";

/** URL 路径段里可原样存活的字符：unreserved 集合（"~" 留给 SEP 作层级用）。 */
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * 把自然键收敛成一个 URL 安全的路径段。
 *
 * ":" 是历史 slug（`cambridge:c11-t1-p1`）里唯一的越界字符，映射到 SEP。
 * 其余越界字符一律抛错而不是静默替换 —— 静默替换会破坏单射性，
 * 两条不同内容算出同一 id 比 seed 报错危险得多。
 */
const segment = (natural: string): string => {
  if (natural.includes(SEP)) {
    throw new Error(`内容自然键不得包含分隔符 "${SEP}"：${natural}`);
  }
  const mapped = natural.replaceAll(":", SEP);
  if (!mapped.split(SEP).every((part) => SAFE_SEGMENT.test(part))) {
    throw new Error(`内容自然键含 URL 不安全字符，无法构造 id：${natural}`);
  }
  return mapped;
};

/**
 * 内容 id 构造器。每个键对应一张内容表，入参就是该表的自然键。
 *
 * 自然键选择（唯一性均已对库校验）：
 *   word            spelling            5031/5031 唯一，纯字母
 *   passage         source              112/112 全局唯一，已是 slug
 *   question        passageId + index   1318/1318 唯一
 *   writingPrompt   task + prompt       20/20 唯一（长文本 → 取哈希）
 *   speakingPrompt  part + question     13/13 唯一（长文本 → 取哈希）
 *
 * 注意 source 本身仍保留 ":"（listening 解析册/套/section 依赖该格式），
 * 只有 id 走 segment() 转换。source 与 id 的映射是双向确定的。
 */
export const contentId = {
  /** 词条 id = 拼写本身。`abandon` */
  word: (spelling: string): string => segment(spelling),

  /** 篇目 id = source 的 URL 安全形态。`cambridge~c11-t1-p1` */
  passage: (source: string): string => segment(source),

  /** 题目 id = 篇目 id + 题号。`cambridge~c11-t1-p1~q1` */
  question: (passageId: string, index: number): string => `${passageId}${SEP}q${index}`,

  /** 写作题 id = wp + hash(task, prompt)。`wp~3f2a…` */
  writingPrompt: (task: string, prompt: string): string => `wp${SEP}${hash16(task, prompt)}`,

  /** 口语题 id = sp + hash(part, question)。`sp~9c17…` */
  speakingPrompt: (part: number, question: string): string =>
    `sp${SEP}${hash16(String(part), question)}`,
} as const;

/** id 是否已是 URL 安全形态。迁移脚本用它判断是否需要重写。 */
export const isUrlSafeContentId = (id: string): boolean =>
  id.split(SEP).every((part) => SAFE_SEGMENT.test(part));

export type ContentKind = keyof typeof contentId;