import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { providerReady } from "@/lib/env";
import { EssayEditor } from "@/components/writing/essay-editor";

export default async function WritingPromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const user = await requireUser();
  if (!user) return null;
  const { promptId } = await params;
  const prompt = await prisma.writingPrompt.findUnique({ where: { id: promptId } });
  if (!prompt) notFound();

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">
          {prompt.task === "task1" ? "Task 1" : "Task 2"} · {prompt.category}
        </h1>
        <p className="text-sm text-muted-foreground">
          {prompt.minWords}+ 词 · {prompt.timeMinutes} 分钟 · AI 4 维批改
        </p>
      </div>
      <EssayEditor
        promptId={prompt.id}
        prompt={prompt.prompt}
        minWords={prompt.minWords}
        minutes={prompt.timeMinutes}
        aiReady={providerReady("text")}
      />
    </div>
  );
}
