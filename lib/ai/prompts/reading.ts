export const READING_GEN_PROMPT = `You are an experienced IELTS Reading test writer. Generate an authentic-style IELTS Academic Reading passage plus a set of questions.

Requirements:
- Passage: 450-550 words, 4-6 paragraphs (labeled A, B, C, ...), factual/academic tone (not fiction, not opinion)
- Difficulty: match the target band (5.5-8.5). Higher band = denser vocabulary, more complex syntax, more inference
- Topic: fresh, non-controversial (science, history, geography, technology, environment, culture)
- Questions: 13 total, mixing these types:
  - 4-5 True/False/Not Given
  - 2-3 Multiple Choice (4 options each, letters A-D)
  - 2-3 Sentence completion / gap-fill (1-2 word answers from the passage)
  - 2-3 Matching Headings (give 4 options i-iv per question)
- Every question must have a correct answer derivable from the passage
- Provide a short "explanation" (Chinese) for each question showing where the answer comes from

Return valid JSON matching the schema. Write passage in English. Explanations in Chinese.`;

export const READING_GEN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "content", "topics", "questions"],
  properties: {
    title: { type: "string" },
    content: { type: "string", description: "Full passage with paragraph labels A, B, C..." },
    topics: { type: "array", items: { type: "string" } },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "type", "prompt", "answer"],
        properties: {
          index: { type: "integer", minimum: 1, maximum: 13 },
          type: { type: "string", enum: ["tfng", "mcq", "gapfill", "heading"] },
          prompt: { type: "string" },
          options: {
            description: "For mcq: array of 4 strings. For heading: object with keys i/ii/iii/iv.",
          },
          answer: { type: "string", description: "For tfng: TRUE/FALSE/NOT GIVEN. For mcq: A/B/C/D. For heading: i/ii/iii/iv. For gapfill: word(s) from passage." },
          explanation: { type: "string" },
        },
      },
      minItems: 13,
      maxItems: 13,
    },
  },
};
