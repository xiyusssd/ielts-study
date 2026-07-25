"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { planStudy, type ModuleName } from "@/lib/planner/algorithm";
import type { Bands } from "@/lib/scoring/band-mapper";

const inputSchema = z.object({
  targetOverall: z.coerce.number().min(4).max(9),
  targetListening: z.coerce.number().min(4).max(9),
  targetReading: z.coerce.number().min(4).max(9),
  targetWriting: z.coerce.number().min(4).max(9),
  targetSpeaking: z.coerce.number().min(4).max(9),
  examDate: z.string().refine((s) => !isNaN(Date.parse(s)), "日期无效"),
  weeklyHours: z.coerce.number().min(1).max(80),
});

export type PlanResult = { ok: true } | { ok: false; error: string };

export async function createOrUpdatePlan(formData: FormData): Promise<PlanResult> {
  const user = (await requireUser())!;
  const parsed = inputSchema.safeParse({
    targetOverall: formData.get("targetOverall"),
    targetListening: formData.get("targetListening"),
    targetReading: formData.get("targetReading"),
    targetWriting: formData.get("targetWriting"),
    targetSpeaking: formData.get("targetSpeaking"),
    examDate: formData.get("examDate"),
    weeklyHours: formData.get("weeklyHours"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "输入无效" };
  }
  const input = parsed.data;

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const currentBand = profile?.currentBand
    ? (JSON.parse(profile.currentBand) as Bands & { overall: number })
    : ({ vocab: 5.5, listening: 5.5, reading: 5.5, writing: 5.5, speaking: 5.5, overall: 5.5 } as Bands & { overall: number });

  const { weeks, tasks } = planStudy({
    current: currentBand,
    targets: {
      overall: input.targetOverall,
      listening: input.targetListening,
      reading: input.targetReading,
      writing: input.targetWriting,
      speaking: input.targetSpeaking,
    },
    examDate: new Date(input.examDate),
    weeklyHours: input.weeklyHours,
  });

  // 更新 profile
  await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      targetOverall: input.targetOverall,
      targetListening: input.targetListening,
      targetReading: input.targetReading,
      targetWriting: input.targetWriting,
      targetSpeaking: input.targetSpeaking,
      examDate: new Date(input.examDate),
      weeklyHours: input.weeklyHours,
    },
    update: {
      targetOverall: input.targetOverall,
      targetListening: input.targetListening,
      targetReading: input.targetReading,
      targetWriting: input.targetWriting,
      targetSpeaking: input.targetSpeaking,
      examDate: new Date(input.examDate),
      weeklyHours: input.weeklyHours,
    },
  });

  // 删旧计划，创建新计划（Cascade 删除关联 WeekPlan/DailyTask）
  const existing = await prisma.plan.findUnique({ where: { userId: user.id } });
  if (existing) await prisma.plan.delete({ where: { id: existing.id } });

  const plan = await prisma.plan.create({
    data: {
      userId: user.id,
      startDate: weeks[0].startDate,
      endDate: weeks[weeks.length - 1].endDate,
    },
  });

  for (const w of weeks) {
    const wp = await prisma.weekPlan.create({
      data: {
        planId: plan.id,
        weekIndex: w.weekIndex,
        focus: JSON.stringify(w.focus),
      },
    });
    const weekTasks = tasks.filter(
      (t) => t.date >= w.startDate && t.date <= w.endDate,
    );
    if (weekTasks.length > 0) {
      await prisma.dailyTask.createMany({
        data: weekTasks.map((t) => ({
          weekPlanId: wp.id,
          date: t.date,
          module: t.module,
          content: JSON.stringify({
            type: t.contentType,
            minutes: t.minutes,
            description: t.description,
          }),
        })),
      });
    }
  }

  revalidatePath("/plan");
  revalidatePath("/");
  redirect("/plan");
}

export async function toggleTask(taskId: string, completed: boolean) {
  const user = (await requireUser())!;
  const task = await prisma.dailyTask.findUnique({
    where: { id: taskId },
    include: { weekPlan: { include: { plan: true } } },
  });
  if (!task || task.weekPlan.plan.userId !== user.id) return { ok: false };
  await prisma.dailyTask.update({
    where: { id: taskId },
    data: { completed, completedAt: completed ? new Date() : null },
  });
  revalidatePath("/plan");
  revalidatePath("/");
  return { ok: true };
}
