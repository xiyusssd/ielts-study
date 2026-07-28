/** 每日词量默认值（用户未自定义时用）。非 "use server"，可导出常量。 */
export const DEFAULT_DAILY_NEW = 20;
export const DEFAULT_DAILY_REVIEW = 100;

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
