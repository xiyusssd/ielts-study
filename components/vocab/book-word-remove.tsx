"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { removeWordFromBook } from "@/lib/vocab/books";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

/** 从自定义词书移除单词。 */
export function BookWordRemoveButton({ bookId, wordId, spelling }: { bookId: string; wordId: string; spelling: string }) {
  const [pending, start] = useTransition();

  function onRemove() {
    start(async () => {
      const res = await removeWordFromBook({ bookId, wordId });
      if (res.ok) toast.success(`已从词书移除 ${spelling}`);
      else toast.error(res.error);
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={onRemove} disabled={pending} title="移出词书">
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}