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
