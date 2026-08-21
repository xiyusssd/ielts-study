/** 每日词量默认值与范围（用户未自定义时用）。非 "use server"，可导出常量。 */
export const DEFAULT_DAILY_NEW = 50;
export const MIN_DAILY_NEW = 30;
export const MAX_DAILY_NEW = 100;
export const NEW_WORDS_STEP = 10;

/** 复习:新词 配比：1:2 / 1:3（ratio = 每个新词搭配的复习数）。 */
export const REVIEW_RATIOS = [2, 3] as const;
export type ReviewRatio = (typeof REVIEW_RATIOS)[number];
export const DEFAULT_REVIEW_RATIO: ReviewRatio = 2;
export const DEFAULT_DAILY_REVIEW = DEFAULT_DAILY_NEW * DEFAULT_REVIEW_RATIO;

/** 按新词数与配比计算每日复习上限。 */
export const dailyReviewOf = (newWords: number, ratio: ReviewRatio) => newWords * ratio;

/** 归一化用户设置（防脏数据）：新词夹到 50-100，配比只认 2/3。 */
export function normalizeDailyGoals(newWords: number, ratio: number) {
  const nw = Math.max(MIN_DAILY_NEW, Math.min(MAX_DAILY_NEW, Math.round(newWords) || DEFAULT_DAILY_NEW));
  const r = (REVIEW_RATIOS as readonly number[]).includes(ratio) ? (ratio as ReviewRatio) : DEFAULT_REVIEW_RATIO;
  return { newWords: nw, ratio: r, reviewWords: nw * r };
}

/** 可锁定的词书（token 对应 Word.tags 里的裸标记）。顺序即展示顺序。 */
export const VOCAB_BOOKS = [
  { id: "ielts", label: "雅思" },
  { id: "toefl", label: "托福" },
  { id: "gre", label: "GRE" },
  { id: "cet6", label: "六级" },
  { id: "cet4", label: "四级" },
  { id: "kaoyan", label: "考研" },
  { id: "gaokao", label: "高考" },
  { id: "awl", label: "学术词 AWL" },
] as const;

export const VOCAB_BOOK_IDS = VOCAB_BOOKS.map((b) => b.id);
export type VocabBookId = (typeof VOCAB_BOOKS)[number]["id"];
