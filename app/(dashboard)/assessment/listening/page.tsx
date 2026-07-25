import { LISTENING_SCRIPT, LISTENING_QUESTIONS } from "@/lib/assessment/seed-data";
import { ListeningTest } from "@/components/assessment/listening-test";

export default function ListeningAssessmentPage() {
  return <ListeningTest script={LISTENING_SCRIPT} questions={LISTENING_QUESTIONS} />;
}
