import type { Bands } from "@/lib/scoring/band-mapper";

/** 一次评估的完整结果（存入 Assessment.results JSON） */
export type AssessmentResults = {
  startedAt: string;
  completedAt?: string;
  sections: {
    vocab?: SectionResult<VocabAnswer>;
    listening?: SectionResult<TextAnswer>;
    reading?: SectionResult<TextAnswer>;
    writing?: SectionResult<WritingAnswer>;
    speaking?: SectionResult<SpeakingAnswer>;
  };
};

export type SectionResult<A> = {
  submittedAt: string;
  answers: A;
  score?: number; // 0-9 band
  raw?: Record<string, unknown>; // section-specific raw data
};

export type VocabAnswer = Record<string, string>; // { questionId: choice }
export type TextAnswer = Record<string, string>;  // { questionId: answer }
export type WritingAnswer = { content: string; wordCount: number; duration: number };
export type SpeakingAnswer = { transcript: string; audioPath?: string; skipped?: boolean };

/** 5 段名称（枚举 + 顺序） */
export const SECTIONS = ["vocab", "listening", "reading", "writing", "speaking"] as const;
export type SectionName = (typeof SECTIONS)[number];

export const SECTION_META: Record<SectionName, { label: string; minutes: number; description: string }> = {
  vocab: { label: "词汇量测试", minutes: 8, description: "30 道题 · 4 个词汇等级自适应" },
  listening: { label: "听力测试", minutes: 10, description: "3 分钟音频 · 6 道题" },
  reading: { label: "阅读测试", minutes: 20, description: "1 篇短文 · 8 道题" },
  writing: { label: "写作测试", minutes: 15, description: "Task 2 简版 · 200 词" },
  speaking: { label: "口语测试", minutes: 5, description: "P1 三个问题 · AI 考官对话" },
};

export type BandsWithOverall = Bands & { overall: number };
