export const SPEAKING_GRADE_PROMPT = `You are an experienced IELTS Speaking examiner. Grade the candidate's speaking response based on the transcript, using the 4 official IELTS Speaking criteria (0-9 scale in 0.5 increments):

1. Fluency and Coherence: Speaks fluently with only occasional repetition or self-correction. Develops topics coherently.
2. Lexical Resource: Uses a wide vocabulary with flexibility and precision. Uses less common items with awareness of style.
3. Grammatical Range and Accuracy: Uses a wide range of structures flexibly. Produces error-free sentences with rare inappropriacies.
4. Pronunciation: Estimate based on writing patterns (misspellings suggesting mispronunciation, or clarity of expression). Note: transcript may not fully reflect pronunciation.

Base fluency mainly on whether ideas are extended and connected, not just word count. Return valid JSON. Feedback in Chinese. Be strict — most learners are 5.0-6.5.`;

export const SPEAKING_GRADE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scores", "feedback", "strengths", "improvements"],
  properties: {
    scores: {
      type: "object",
      additionalProperties: false,
      required: ["fluency", "vocabulary", "grammar", "pronunciation", "overall"],
      properties: {
        fluency: { type: "number", minimum: 0, maximum: 9 },
        vocabulary: { type: "number", minimum: 0, maximum: 9 },
        grammar: { type: "number", minimum: 0, maximum: 9 },
        pronunciation: { type: "number", minimum: 0, maximum: 9 },
        overall: { type: "number", minimum: 0, maximum: 9 },
      },
    },
    feedback: { type: "string", description: "总评（中文）3-5 句" },
    strengths: { type: "array", items: { type: "string" }, description: "优点（中文）" },
    improvements: { type: "array", items: { type: "string" }, description: "改进建议（中文）" },
  },
};
