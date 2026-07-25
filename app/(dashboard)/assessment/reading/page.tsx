import { READING_PASSAGE, READING_QUESTIONS } from "@/lib/assessment/seed-data";
import { ReadingTest } from "@/components/assessment/reading-test";

export default function ReadingAssessmentPage() {
  return <ReadingTest passage={READING_PASSAGE} questions={READING_QUESTIONS} />;
}
