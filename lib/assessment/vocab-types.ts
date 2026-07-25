/** 词汇题的类型与常量（client/server 共享，无副作用）*/

export const VOCAB_LEVELS = [3000, 5000, 7000, 8500] as const;
export type VocabLevel = (typeof VOCAB_LEVELS)[number];

export const NONE_OF_ABOVE = "以上都不正确";

export type VocabOption = { text: string; fromWord?: string };

/** 下发给 client 的题目（含答案，instant feedback 需要）*/
export type GenVocabQ = {
  id: string;
  level: VocabLevel;
  word: string;
  ipa: string | null;
  options: VocabOption[]; // 含末尾的「以上都不正确」
  answer: number; // 正确选项下标
};
