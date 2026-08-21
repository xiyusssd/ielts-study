"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 标记/取消错词已掌握。 */
export async function setMistakeMastered(input: { wordId: string; mastered: boolean }): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };

  await prisma.mistakeWord.updateMany({
    where: { userId: user.id, wordId: input.wordId },
    data: { mastered: input.mastered },
  });
  revalidatePath("/vocab/mistakes");
  revalidatePath("/vocab");
  return { ok: true };
}

/** 移除单条错词记录。 */
export async function removeMistake(input: { wordId: string }): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };

  await prisma.mistakeWord.deleteMany({ where: { userId: user.id, wordId: input.wordId } });
  revalidatePath("/vocab/mistakes");
  revalidatePath("/vocab");
  return { ok: true };
}

/** 清空全部错词。 */
export async function clearMistakes(): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };

  await prisma.mistakeWord.deleteMany({ where: { userId: user.id } });
  revalidatePath("/vocab/mistakes");
  revalidatePath("/vocab");
  return { ok: true };
}