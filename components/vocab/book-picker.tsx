"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveVocabBook } from "@/lib/vocab/actions";
import { VOCAB_BOOKS } from "@/lib/vocab/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookMarked, Check, Globe } from "lucide-react";

// 当前锁定的词书 = current；null 表示学全部。counts: 各书词量。
export function BookPicker({
  current,
  counts,
}: {
  current: string | null;
  counts: Record<string, number>;
}) {
  const [sel, setSel] = useState<string | null>(current);
  const [pending, start] = useTransition();

  function choose(book: string | null) {
    if (book === sel) return;
    const prev = sel;
    setSel(book);
    start(async () => {
      const res = await saveVocabBook(book);
      if (res.ok) {
        const label = book ? VOCAB_BOOKS.find((b) => b.id === book)?.label : "全部词库";
        toast.success(`已锁定：${label}`);
      } else {
        setSel(prev);
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookMarked className="h-4 w-4 text-primary" />
          学习词书
        </CardTitle>
        <CardDescription>
          锁定一本词书，今日队列的新词只从该书抽取。随时可切换。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {/* 全部词库 */}
          <BookChip
            active={sel === null}
            disabled={pending}
            onClick={() => choose(null)}
            label="全部词库"
            icon
          />
          {VOCAB_BOOKS.map((b) => {
            const n = counts[b.id] ?? 0;
            if (n === 0) return null;
            return (
              <BookChip
                key={b.id}
                active={sel === b.id}
                disabled={pending}
                onClick={() => choose(b.id)}
                label={b.label}
                count={n}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function BookChip({
  active, disabled, onClick, label, count, icon,
}: {
  active: boolean; disabled: boolean; onClick: () => void; label: string; count?: number; icon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all disabled:opacity-60 " +
        (active
          ? "border-primary bg-primary/10 text-primary shadow-soft"
          : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground")
      }
    >
      {active ? <Check className="h-3.5 w-3.5" /> : icon ? <Globe className="h-3.5 w-3.5" /> : null}
      <span>{label}</span>
      {count != null && <span className="nums text-xs opacity-60">{count}</span>}
    </button>
  );
}
