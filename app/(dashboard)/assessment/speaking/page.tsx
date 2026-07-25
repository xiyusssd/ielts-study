import { SPEAKING_QUESTIONS } from "@/lib/assessment/seed-data";
import { SpeakingTest } from "@/components/assessment/speaking-test";
import { providerReady } from "@/lib/env";

export default function SpeakingAssessmentPage() {
  return <SpeakingTest questions={SPEAKING_QUESTIONS} aiReady={providerReady("text")} />;
}
