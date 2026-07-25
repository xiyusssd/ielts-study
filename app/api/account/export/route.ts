import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/**
 * GDPR 数据可携带：下载用户所有数据的 JSON。
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const [profile, assessments, plan, vocabProgress, attempts, writings, speakings] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.assessment.findMany({ where: { userId: user.id } }),
    prisma.plan.findUnique({
      where: { userId: user.id },
      include: { weeks: { include: { tasks: true } } },
    }),
    prisma.vocabProgress.findMany({
      where: { userId: user.id },
      include: { word: { select: { spelling: true, level: true } } },
    }),
    prisma.attempt.findMany({ where: { userId: user.id } }),
    prisma.writingSubmission.findMany({
      where: { userId: user.id },
      include: { prompt: { select: { task: true, category: true, prompt: true } } },
    }),
    prisma.speakingSession.findMany({ where: { userId: user.id } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
    assessments,
    plan,
    vocabProgress,
    attempts,
    writings,
    speakings,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ielts-data-${user.id.slice(0, 8)}.json"`,
    },
  });
}
