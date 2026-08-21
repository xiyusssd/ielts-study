"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 自定义词书只有一个「全部单词」章节（index 0），单词按加入顺序排列。 */
const OWN_CHAPTER = 0;

/** 自定义词书 slug 必须 URL 安全且唯一：userId 前 8 位 + 时间戳 36 进制。 */
function newSlug(userId: string): string {
  return `u${userId.slice(0, 8)}-${Date.now().toString(36)}`;
}

/** 校验词书存在且属于该用户的自定义词书。 */
async function requireOwnBook(userId: string, bookId: string) {
  const book = await prisma.wordBook.findUnique({ where: { id: bookId } });
  if (!book) return { ok: false as const, error: "词书不存在" };
  if (book.kind !== "custom" || book.userId !== userId) {
    return { ok: false as const, error: "只能管理自己创建的词书" };
  }
  return { ok: true as const, book };
}

/** 创建自定义词书。 */
export async function createBook(input: { title: string; description?: string }): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };
  const title = input.title.trim();
  if (!title || title.length > 40) return { ok: false, error: "词书名称 1-40 字" };

  const slug = newSlug(user.id);
  await prisma.wordBook.create({
    data: {
      id: `wbc~${slug}`,
      slug,
      title,
      description: input.description?.trim() || null,
      kind: "custom",
      userId: user.id,
      chapters: { create: { index: OWN_CHAPTER, title: "全部单词" } },
    },
  });
  revalidatePath("/vocab/books");
  return { ok: true };
}

/** 重命名/改简介（仅自己的自定义词书）。 */
export async function updateBook(input: { bookId: string; title: string; description?: string }): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };
  const title = input.title.trim();
  if (!title || title.length > 40) return { ok: false, error: "词书名称 1-40 字" };

  const check = await requireOwnBook(user.id, input.bookId);
  if (!check.ok) return check;

  await prisma.wordBook.update({
    where: { id: input.bookId },
    data: { title, description: input.description?.trim() || null },
  });
  revalidatePath("/vocab/books");
  revalidatePath(`/vocab/books/${input.bookId}`);
  return { ok: true };
}

/** 删除自定义词书（连带章节/词条级联删除）。 */
export async function deleteBook(input: { bookId: string }): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };
  const check = await requireOwnBook(user.id, input.bookId);
  if (!check.ok) return check;

  await prisma.wordBook.delete({ where: { id: input.bookId } });
  revalidatePath("/vocab/books");
  return { ok: true };
}

/** 向自定义词书添加单词（追加到「全部单词」章节末尾）。 */
export async function addWordToBook(input: { bookId: string; wordId: string }): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };
  const check = await requireOwnBook(user.id, input.bookId);
  if (!check.ok) return check;

  const word = await prisma.word.findUnique({ where: { id: input.wordId }, select: { id: true } });
  if (!word) return { ok: false, error: "单词不存在" };

  const chapter = await prisma.wordChapter.findUnique({
    where: { bookId_index: { bookId: input.bookId, index: OWN_CHAPTER } },
    select: { id: true },
  });
  if (!chapter) return { ok: false, error: "词书章节缺失" };

  const exists = await prisma.chapterWord.findUnique({
    where: { chapterId_wordId: { chapterId: chapter.id, wordId: input.wordId } },
  });
  if (exists) return { ok: true };

  const last = await prisma.chapterWord.findFirst({
    where: { chapterId: chapter.id },
    orderBy: { index: "desc" },
    select: { index: true },
  });
  await prisma.chapterWord.create({
    data: { chapterId: chapter.id, wordId: input.wordId, index: (last?.index ?? -1) + 1, freq: 0 },
  });
  revalidatePath(`/vocab/books/${input.bookId}`);
  return { ok: true };
}

/** 从自定义词书移除单词。 */
export async function removeWordFromBook(input: { bookId: string; wordId: string }): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "未登录" };
  const check = await requireOwnBook(user.id, input.bookId);
  if (!check.ok) return check;

  const chapter = await prisma.wordChapter.findUnique({
    where: { bookId_index: { bookId: input.bookId, index: OWN_CHAPTER } },
    select: { id: true },
  });
  if (chapter) {
    await prisma.chapterWord.deleteMany({
      where: { chapterId: chapter.id, wordId: input.wordId },
    });
  }
  revalidatePath(`/vocab/books/${input.bookId}`);
  return { ok: true };
}