import { prisma } from "@/lib/db";

/** 听写页词条的展示形态（不含拼写，避免听写时看到答案）。 */
export type DictationWord = {
  wordId: string;
  spelling: string;
  ipa: string | null;
  translations: { pos: string; meaning: string }[];
};

export type DictationList = {
  items: DictationWord[];
  scope: "book" | "chapter" | "mistakes" | "favorites" | "random";
  scopeId: string | null;
  label: string;
};

/** 解析 Word.translations 列。 */
function parseTranslations(raw: string): { pos: string; meaning: string }[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const toItem = (w: { id: string; spelling: string; ipa: string | null; translations: string }): DictationWord => ({
  wordId: w.id,
  spelling: w.spelling,
  ipa: w.ipa,
  translations: parseTranslations(w.translations),
});

/**
 * 解析听写页的词源：
 *   ?book=<bookId>[&chapter=<chapterId>]  词书/章节
 *   ?source=mistakes                       未掌握错词
 *   ?source=favorites                      生词本
 *   （缺省）                                随机词
 */
export async function resolveDictationItems(
  userId: string,
  q: { book?: string; chapter?: string; source?: string; n?: string },
): Promise<DictationList> {
  const n = Math.max(1, Math.min(200, Number.parseInt(q.n ?? "20", 10) || 20));

  if (q.book) {
    const book = await prisma.wordBook.findUnique({ where: { id: q.book } });
    if (book) {
      if (q.chapter) {
        const chapter = await prisma.wordChapter.findUnique({
          where: { id: q.chapter },
          include: {
            words: {
              orderBy: { index: "asc" },
              take: n,
              include: { word: { select: { id: true, spelling: true, ipa: true, translations: true } } },
            },
          },
        });
        if (chapter && chapter.bookId === book.id && chapter.words.length > 0) {
          return {
            items: chapter.words.map((cw) => toItem(cw.word)),
            scope: "chapter",
            scopeId: chapter.id,
            label: `${book.title} · ${chapter.title}`,
          };
        }
      }
      // 整本词书：按章节序取前 n 词
      const rows = await prisma.chapterWord.findMany({
        where: { chapter: { bookId: book.id } },
        orderBy: [{ chapter: { index: "asc" } }, { index: "asc" }],
        take: n,
        include: { word: { select: { id: true, spelling: true, ipa: true, translations: true } } },
      });
      if (rows.length > 0) {
        return { items: rows.map((cw) => toItem(cw.word)), scope: "book", scopeId: book.id, label: book.title };
      }
    }
    // 词书不存在/为空 → 空列表，由页面展示空状态
    return { items: [], scope: "book", scopeId: q.book, label: "词书听写" };
  }

  if (q.source === "mistakes") {
    const rows = await prisma.mistakeWord.findMany({
      where: { userId, mastered: false },
      orderBy: [{ count: "desc" }, { lastWrongAt: "desc" }],
      take: n,
      include: { word: { select: { id: true, spelling: true, ipa: true, translations: true } } },
    });
    return { items: rows.map((m) => toItem(m.word)), scope: "mistakes", scopeId: null, label: "错词听写" };
  }

  if (q.source === "favorites") {
    const rows = await prisma.favoriteWord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: n,
      include: { word: { select: { id: true, spelling: true, ipa: true, translations: true } } },
    });
    return { items: rows.map((f) => toItem(f.word)), scope: "favorites", scopeId: null, label: "生词本听写" };
  }

  // 缺省：随机 n 词（SQLite ORDER BY RANDOM）
  const rows = await prisma.$queryRawUnsafe<{ id: string; spelling: string; ipa: string | null; translations: string }[]>(
    `SELECT id, spelling, ipa, translations FROM Word ORDER BY RANDOM() LIMIT ?`,
    n,
  );
  return { items: rows.map(toItem), scope: "random", scopeId: null, label: "随机听写" };
}