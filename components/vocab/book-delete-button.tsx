"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteBook } from "@/lib/vocab/books";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

/** 删除自定义词书（带确认）。 */
export function BookDeleteButton({ bookId, title }: { bookId: string; title: string }) {
  const [pending, start] = useTransition();

  function onDelete() {
    if (!window.confirm(`删除词书「${title}」？章节与词条将一并删除，不影响已学进度。`)) return;
    start(async () => {
      const res = await deleteBook({ bookId });
      if (res.ok) toast.success("词书已删除");
      else toast.error(res.error);
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={onDelete} disabled={pending} title="删除词书">
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}