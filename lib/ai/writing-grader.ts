import { ai } from "@/lib/ai";
import { WRITING_GRADE_PROMPT, WRITING_GRADE_SCHEMA } from "@/lib/ai/prompts/writing";

export type WritingGradeResult = {
  scores: { tr: number; cc: number; lr: number; gra: number; overall: number };
  feedback: string;
  paragraphComments: string[];
  corrections: { wrong: string; correct: string; explain: string }[];
};

export async function gradeWriting(input: { prompt: string; content: string }): Promise<WritingGradeResult> {
  const provider = ai("text");
  if (!provider.chatJSON) throw new Error(`${provider.name} 不支持结构化输出`);

  const graded = await provider.chatJSON<WritingGradeResult>(
    [
      { role: "system", content: WRITING_GRADE_PROMPT },
      { role: "user", content: `TASK PROMPT:\n${input.prompt}\n\nSTUDENT RESPONSE:\n${input.content}` },
    ],
    WRITING_GRADE_SCHEMA,
    { temperature: 0.3, maxTokens: 2000 },
  );

  // 归一化：把 4 维 score 换算成 overall
  const overall = (graded.scores.tr + graded.scores.cc + graded.scores.lr + graded.scores.gra) / 4;
  graded.scores.overall = Math.round(overall * 2) / 2;
  return graded;
}
