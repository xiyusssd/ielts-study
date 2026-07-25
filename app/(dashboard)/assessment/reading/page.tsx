import { pickReadingSet } from "@/lib/assessment/pools/pick";
import { ReadingTest } from "@/components/assessment/reading-test";

export const dynamic = "force-dynamic";

export default function ReadingAssessmentPage() {
  const set = pickReadingSet();
  return (
    <ReadingTest
      poolId={set.id}
      passage={{ title: set.title, content: set.content }}
      questions={set.questions}
    />
  );
}
