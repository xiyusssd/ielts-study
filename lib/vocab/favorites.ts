"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export type FavoriteResult = { ok: true; added: boolean } | { ok: false; error: string };

/** 收藏/取消收藏一个单词（Ctrl+Q 与单词详情页共用）。 */
export async function toggleFavorite(input: { wordId: string; note?: string }): Promise<FavoriteResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };

  const existing = await prisma.favoriteWord.findUnique({
    where: { userId_wordId: { userId: user.id, wordId: input.wordId } },
  });

  if (existing) {
    await prisma.favoriteWord.delete({ where: { id: existing.id } });
    revalidatePath("/vocab/favorites");
    revalidatePath("/vocab"); // 首页生词本计数
    return { ok: true, added: false };
  }

  await prisma.favoriteWord.create({
    data: { userId: user.id, wordId: input.wordId, note: input.note?.trim() || null },
  });
  revalidatePath("/vocab/favorites");
  revalidatePath("/vocab");
  return { ok: true, added: true };
}

/** 直接移除收藏。 */
export async function removeFavorite(input: { wordId: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };

  await prisma.favoriteWord.deleteMany({ where: { userId: user.id, wordId: input.wordId } });
  revalidatePath("/vocab/favorites");
  revalidatePath("/vocab"); // 首页生词本计数
  return { ok: true };
}