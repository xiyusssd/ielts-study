import { ai } from "@/lib/ai";
import { SPEAKING_GRADE_PROMPT, SPEAKING_GRADE_SCHEMA } from "@/lib/ai/prompts/speaking";

export type SpeakingGradeResult = {
  scores: {
    fluency: number;
    vocabulary: number;
    grammar: number;
    pronunciation: number;
    overall: number;
  };
  feedback: string;
  strengths: string[];
  improvements: string[];
};

export async function gradeSpeaking(input: { transcript: string }): Promise<SpeakingGradeResult> {
  const provider = ai("text");
  if (!provider.chatJSON) throw new Error(`${provider.name} 不支持结构化输出`);

  const graded = await provider.chatJSON<SpeakingGradeResult>(
    [
      { role: "system", content: SPEAKING_GRADE_PROMPT },
      { role: "user", content: `TRANSCRIPT:\n${input.transcript}` },
    ],
    SPEAKING_GRADE_SCHEMA,
    { temperature: 0.3, maxTokens: 1500 },
  );

  const overall = (graded.scores.fluency + graded.scores.vocabulary + graded.scores.grammar + graded.scores.pronunciation) / 4;
  graded.scores.overall = Math.round(overall * 2) / 2;
  return graded;
}
