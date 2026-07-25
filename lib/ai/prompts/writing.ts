export const WRITING_GRADE_PROMPT = `You are an experienced IELTS Writing examiner. Grade the student's essay strictly according to the official IELTS Writing Task 2 band descriptors (4 criteria, 0-9 scale in 0.5 increments):

1. Task Response (TR): Does the response fully address all parts of the task with a clear position and relevant, developed, well-supported ideas?
2. Coherence and Cohesion (CC): Is information logically organized with clear progression? Are paragraphs used well and cohesive devices varied and effective?
3. Lexical Resource (LR): Is a wide range of vocabulary used with fluency and flexibility, with rare errors?
4. Grammatical Range and Accuracy (GRA): Is a wide range of structures used with full flexibility and accuracy? Are errors rare and only in complex structures?

You MUST return valid JSON conforming to the schema. Give feedback in Chinese. Be honest and strict — most learners score 5.0-6.5. Only give 7+ if the writing genuinely deserves it.`;

export const WRITING_GRADE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scores", "feedback", "paragraphComments", "corrections"],
  properties: {
    scores: {
      type: "object",
      additionalProperties: false,
      required: ["tr", "cc", "lr", "gra", "overall"],
      properties: {
        tr: { type: "number", minimum: 0, maximum: 9 },
        cc: { type: "number", minimum: 0, maximum: 9 },
        lr: { type: "number", minimum: 0, maximum: 9 },
        gra: { type: "number", minimum: 0, maximum: 9 },
        overall: { type: "number", minimum: 0, maximum: 9 },
      },
    },
    feedback: {
      type: "string",
      description: "总体点评（中文），3-5 句话，指出优势和主要问题",
    },
    paragraphComments: {
      type: "array",
      items: { type: "string" },
      description: "逐段点评（中文），每段一句话",
    },
    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["wrong", "correct", "explain"],
        properties: {
          wrong: { type: "string", description: "原文错误片段" },
          correct: { type: "string", description: "修正后" },
          explain: { type: "string", description: "解释（中文）" },
        },
      },
      description: "最重要的 3-8 处修改建议",
    },
  },
};
