import { WRITING_PROMPT } from "@/lib/assessment/seed-data";
import { WritingTest } from "@/components/assessment/writing-test";
import { providerReady } from "@/lib/env";

export default function WritingAssessmentPage() {
  return (
    <WritingTest
      prompt={WRITING_PROMPT.content}
      minWords={WRITING_PROMPT.minWords}
      minutes={WRITING_PROMPT.minutes}
      aiReady={providerReady("text")}
    />
  );
}
