import { pickListeningSet } from "@/lib/assessment/pools/pick";
import { scriptText } from "@/lib/assessment/pools/types";
import { ListeningTest } from "@/components/assessment/listening-test";

export const dynamic = "force-dynamic";

export default function ListeningAssessmentPage() {
  const set = pickListeningSet();
  return (
    <ListeningTest
      poolId={set.id}
      title={set.title}
      script={scriptText(set)}
      questions={set.questions}
    />
  );
}
