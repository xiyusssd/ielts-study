import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import type { Bands } from "@/lib/scoring/band-mapper";
import { PlanSetupForm } from "@/components/planner/setup-form";

export default async function PlanSetupPage() {
  const user = await requireUser();
  if (!user) return null;
  const [profile, latestAssessment] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.assessment.findFirst({
      where: { userId: user.id, type: "initial" },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!latestAssessment) redirect("/assessment");

  const currentBands = JSON.parse(latestAssessment.bands) as Bands & { overall: number };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">备考规划</h1>
        <p className="text-muted-foreground">
          告诉我们你的目标，AI 会根据你的当前水平和时间安排生成周计划
        </p>
      </div>
      <PlanSetupForm
        current={currentBands}
        defaults={{
          targetOverall: profile?.targetOverall ?? 7.0,
          targetListening: profile?.targetListening ?? 7.0,
          targetReading: profile?.targetReading ?? 7.0,
          targetWriting: profile?.targetWriting ?? 6.5,
          targetSpeaking: profile?.targetSpeaking ?? 6.5,
          examDate: profile?.examDate?.toISOString().split("T")[0] ?? defaultExamDate(),
          weeklyHours: profile?.weeklyHours ?? 10,
        }}
      />
    </div>
  );
}

function defaultExamDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 8 * 7); // 8 周后
  return d.toISOString().split("T")[0];
}
