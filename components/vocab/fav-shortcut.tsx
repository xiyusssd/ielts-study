"use client";

import { useEffect, useTransition } from "react";
import { toast } from "sonner";
import { toggleFavorite } from "@/lib/vocab/favorites";
import { getCurrentWord } from "@/lib/vocab/current-word";

/**
 * 全局 Ctrl+Q 收藏快捷键。挂在 dashboard 布局里。
 * 只监听 Ctrl+Q（macOS 上 Cmd+Q 是退出应用，不劫持）。
 */
export function FavShortcut() {
  const [pending, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() !== "q") return;
      const wordId = getCurrentWord();
      if (!wordId) {
        toast.info("当前没有正在学习的单词");
        return;
      }
      if (pending) return;
      e.preventDefault();
      start(async () => {
        const res = await toggleFavorite({ wordId });
        if (res.ok) toast.success(res.added ? "已加入生词本" : "已移出收藏");
        else toast.error(res.error);
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  return null;
}