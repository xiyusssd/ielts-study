"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setMistakeMastered, removeMistake, clearMistakes } from "@/lib/vocab/mistakes";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, Trash2, Eraser } from "lucide-react";

/** 错词行操作：标记掌握 / 恢复 / 移除。 */
export function MistakeRowActions({ wordId, mastered }: { wordId: string; mastered: boolean }) {
  const [pending, start] = useTransition();

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(okMsg);
      else toast.error(res.error ?? "操作失败");
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        title={mastered ? "恢复为未掌握" : "标记已掌握"}
        onClick={() => act(() => setMistakeMastered({ wordId, mastered: !mastered }), mastered ? "已恢复" : "已标记掌握")}
      >
        {mastered ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4 text-success" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        title="移除该错词"
        onClick={() => act(() => removeMistake({ wordId }), "已移除")}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

/** 清空全部错词。 */
export function MistakeClearButton({ disabled }: { disabled: boolean }) {
  const [pending, start] = useTransition();

  function onClear() {
    if (!window.confirm("清空全部错词记录？此操作不可恢复。")) return;
    start(async () => {
      const res = await clearMistakes();
      if (res.ok) toast.success("已清空");
      else toast.error(res.error ?? "操作失败");
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onClear} disabled={disabled || pending}>
      <Eraser className="h-4 w-4" />
      清空
    </Button>
  );
}