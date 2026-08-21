"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createBook } from "@/lib/vocab/books";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

/** 新建自定义词书表单。 */
export function BookCreateForm() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || pending) return;
    start(async () => {
      const res = await createBook({ title, description: desc });
      if (res.ok) {
        toast.success("词书已创建");
        setTitle("");
        setDesc("");
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        新建自定义词书
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">新建自定义词书</CardTitle>
        <CardDescription>创建后可在单词详情页把词加入词书，也可以整本听写/学习。</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="词书名称（如：写作高频替换词）"
            maxLength={40}
            autoFocus
          />
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="简介（可选）"
            maxLength={120}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={!title.trim() || pending}>
              {pending ? "创建中..." : "创建"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}