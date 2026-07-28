import { ai } from "@/lib/ai";
import { READING_GEN_PROMPT, READING_GEN_SCHEMA } from "@/lib/ai/prompts/reading";

export type GeneratedPassage = {
  title: string;
  content: string;
  topics: string[];
  questions: Array<{
    index: number;
    type: "tfng" | "mcq" | "gapfill" | "heading";
    prompt: string;
    options?: string[] | Record<string, string>;
    answer: string;
    explanation?: string;
  }>;
};

const SENTENCE_SCHEMA = {
  type: "object",
  properties: {
    en: { type: "string" },
    zh: { type: "string" },
  },
  required: ["en", "zh"],
  additionalProperties: false,
} as const;

export type SentenceLevel = "easy" | "standard";

const LEVEL_PROMPT: Record<SentenceLevel, string> = {
  easy: '你是英语词汇老师。给定一个英文单词，造一个简单、口语化、容易默写的英文例句，长度 5-10 词，用常见基础词汇(约初中/CEFR A2-B1 水平)，必须包含该单词，并给出准确的中文翻译。严格只输出 JSON，且键名必须是 "en"(英文句) 和 "zh"(中文翻译)，不要用别的键名。',
  standard: '你是雅思词汇老师。给定一个英文单词，造一个自然、地道、难度适中(约雅思 6-7 分)的英文例句，长度 8-16 词，必须包含该单词，并给出准确的中文翻译。严格只输出 JSON，且键名必须是 "en"(英文句) 和 "zh"(中文翻译)，不要用别的键名。',
};

/** 为一个单词现场生成一条新例句(英文 + 中文翻译),用于句子拼写"换一句"。 */
export async function generateExampleSentence(
  word: string,
  level: SentenceLevel = "standard",
): Promise<{ en: string; zh: string }> {
  const provider = ai("text");
  if (!provider.chatJSON) throw new Error(`${provider.name} 不支持结构化输出`);
  // 第三方路由(Claude 系)不强制 schema，可能返回 {sentence,translation} 等别名，
  // 故拿宽松对象再归一化键名。
  const raw = await provider.chatJSON<Record<string, string>>(
    [
      { role: "system", content: LEVEL_PROMPT[level] },
      { role: "user", content: `单词：${word}` },
    ],
    SENTENCE_SCHEMA,
    { temperature: 0.8, maxTokens: 200 },
  );
  const en = raw.en ?? raw.sentence ?? raw.english ?? raw.text ?? "";
  const zh = raw.zh ?? raw.translation ?? raw.chinese ?? raw.cn ?? "";
  if (!en) throw new Error("生成结果缺少英文句子");
  return { en, zh };
}

export async function generateReadingPassage(opts: {
  targetBand: number;
  topic?: string;
}): Promise<GeneratedPassage> {
  const provider = ai("text");
  if (!provider.chatJSON) throw new Error(`${provider.name} 不支持结构化输出`);
  const topicHint = opts.topic ? `\nTopic: ${opts.topic}` : "";
  return provider.chatJSON<GeneratedPassage>(
    [
      { role: "system", content: READING_GEN_PROMPT },
      {
        role: "user",
        content: `Generate a passage targeting IELTS Band ${opts.targetBand}.${topicHint}`,
      },
    ],
    READING_GEN_SCHEMA,
    { temperature: 0.7, maxTokens: 4000 },
  );
}
