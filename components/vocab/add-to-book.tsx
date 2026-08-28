"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { addWordToBook, removeWordFromBook } from "@/lib/vocab/books";
import { BookPlus, Check } from "lucide-react";

export type BookChip = { id: string; title: string; has: boolean };

/**
 * 把单词加入/移出自建词书。
 *
 * 词书页一直写着「在单词详情页加入生词」，但详情页此前没有任何入口，
 * addWordToBook 也就没有调用方——这里补上。
 */
export function AddToBook({ wordId, books }: { wordId: string; books: BookChip[] }) {
  const [inBook, setInBook] = useState<Record<string, boolean>>(
    Object.fromEntries(books.map((b) => [b.id, b.has])),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  if (books.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        还没有自建词书，
        <Link href="/vocab/books" className="text-primary underline underline-offset-2">
          去创建一本
        </Link>
        后就能把生词收进去。
      </p>
    );
  }

  function toggle(book: BookChip) {
    if (pendingId) return;
    const has = !!inBook[book.id];
    setPendingId(book.id);
    setInBook((s) => ({ ...s, [book.id]: !has }));
    start(async () => {
      try {
        const res = has
          ? await removeWordFromBook({ bookId: book.id, wordId })
          : await addWordToBook({ bookId: book.id, wordId });
        if (!res.ok) {
          setInBook((s) => ({ ...s, [book.id]: has })); // 回滚乐观切换
          toast.error(res.error);
        } else {
          toast.success(has ? `已从「${book.title}」移除` : `已加入「${book.title}」`);
        }
      } catch (err) {
        setInBook((s) => ({ ...s, [book.id]: has }));
        toast.error("操作失败：" + (err as Error).message);
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {books.map((b) => {
        const has = !!inBook[b.id];
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => toggle(b)}
            disabled={pendingId === b.id}
            aria-pressed={has}
            title={has ? `从「${b.title}」移除` : `加入「${b.title}」`}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-60 " +
              (has
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted")
            }
          >
            {has ? <Check className="h-3.5 w-3.5" /> : <BookPlus className="h-3.5 w-3.5" />}
            {b.title}
          </button>
        );
      })}
    </div>
  );
}