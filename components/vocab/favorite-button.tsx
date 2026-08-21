"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleFavorite } from "@/lib/vocab/favorites";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

/**
 * 收藏按钮（单词详情页/生词本行共用）。initial 传当前是否已收藏。
 * 备注：单词详情页的收藏状态由服务端查好传入；点击后乐观切换。
 */
export function FavoriteButton({ wordId, initial, size = "sm" }: { wordId: string; initial: boolean; size?: "sm" | "lg" }) {
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();

  function toggle() {
    if (pending) return;
    const prev = fav;
    setFav(!prev);
    start(async () => {
      const res = await toggleFavorite({ wordId });
      if (res.ok) toast.success(res.added ? "已加入生词本" : "已移出收藏");
      else {
        setFav(prev);
        toast.error(res.error);
      }
    });
  }

  return (
    <Button
      variant={fav ? "default" : "outline"}
      size={size}
      onClick={toggle}
      disabled={pending}
      title={fav ? "移出生词本" : "加入生词本（学习时 Ctrl+Q）"}
    >
      <Star className={"h-4 w-4 " + (fav ? "fill-current" : "")} />
      {size === "lg" ? (fav ? "已收藏" : "加入生词本") : fav ? "已收藏" : "收藏"}
    </Button>
  );
}