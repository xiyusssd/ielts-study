import { generateVocabQuestions } from "@/lib/assessment/vocab-gen";
import { VocabTest } from "@/components/assessment/vocab-test";

export const dynamic = "force-dynamic";

export default function VocabAssessmentPage() {
  const questions = generateVocabQuestions();
  return <VocabTest questions={questions} />;
}
