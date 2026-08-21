"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateBook } from "@/lib/vocab/books";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";

/** 自定义词书改名/改简介（行内编辑）。 */
export function BookRenameForm({
  bookId,
  title,
  description,
}: {
  bookId: string;
  title: string;
  description: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [t, setT] = useState(title);
  const [d, setD] = useState(description ?? "");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!t.trim() || pending) return;
    start(async () => {
      const res = await updateBook({ bookId, title: t, description: d });
      if (res.ok) {
        toast.success("已保存");
        setEditing(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  if (!editing) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
        <Pencil className="h-4 w-4" />
        编辑
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Input value={t} onChange={(e) => setT(e.target.value)} maxLength={40} placeholder="词书名称" />
      <Input value={d} onChange={(e) => setD(e.target.value)} maxLength={120} placeholder="简介（可选）" />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!t.trim() || pending}>
          <Check className="h-4 w-4" />
          {pending ? "保存中..." : "保存"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
          <X className="h-4 w-4" />
          取消
        </Button>
      </div>
    </form>
  );
}