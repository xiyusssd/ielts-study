import { VOCAB_QUESTIONS } from "@/lib/assessment/seed-data";
import { VocabTest } from "@/components/assessment/vocab-test";

export default function VocabAssessmentPage() {
  return <VocabTest questions={VOCAB_QUESTIONS} />;
}
