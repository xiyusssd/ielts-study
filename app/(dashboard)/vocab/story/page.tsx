import { requireUser } from "@/lib/auth/session";
import { aiTextReady } from "@/lib/ai/actions";
import { PageHeader } from "@/components/page-header";
import { StoryGenerator } from "@/components/vocab/story-generator";
import { Sparkles } from "lucide-react";

export default async function StoryPage() {
  const user = await requireUser();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in-slide">
      <PageHeader
        icon={Sparkles}
        title="AI 小故事"
        description="把错词/生词编进一个故事，在语境里记单词"
        gradient
      />
      <StoryGenerator aiEnabled={await aiTextReady(user.id)} />
    </div>
  );
}