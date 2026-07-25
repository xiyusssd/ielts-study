"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addWordsToVocab } from "@/lib/reading/actions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function AddWordsButton({ candidates }: { candidates: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  function toggle(w: string) {
    const next = new Set(selected);
    if (next.has(w)) next.delete(w);
    else next.add(w);
    setSelected(next);
  }

  function submit() {
    if (selected.size === 0) {
      toast.info("请选择要加入的生词");
      return;
    }
    start(async () => {
      const res = await addWordsToVocab(Array.from(selected));
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(`已加入 ${res.added} 个，${res.skipped ?? 0} 个已存在或不在词库中`);
        setSelected(new Set());
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="max-h-40 flex-wrap gap-1 overflow-y-auto flex">
        {candidates.map((w) => {
          const on = selected.has(w);
          return (
            <button
              key={w}
              onClick={() => toggle(w)}
              className={
                "rounded border px-2 py-0.5 text-xs " +
                (on ? "border-primary bg-primary/10" : "hover:bg-muted")
              }
            >
              {w}
            </button>
          );
        })}
      </div>
      <Button onClick={submit} disabled={pending || selected.size === 0} size="sm" className="w-full">
        <Plus className="h-4 w-4" />
        {pending ? "加入中..." : `加入 ${selected.size} 词到词汇队列`}
      </Button>
    </div>
  );
}
