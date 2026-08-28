import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * 背词队列为空时的占位卡片。
 *
 * 放在卡片组件内部（而非 study 页服务端早退）是有意为之：会话进行中任何服务端
 * 重渲染（Ctrl+Q 收藏、会话结束刷计数）都会把今日队列算空，若由页面早退渲染空状态，
 * 就会卸载正在进行的卡片、顶掉完成页。空状态归卡片自己管，会话就不会被打断。
 */
export function EmptyQueue({
  label,
  title,
  hint,
}: {
  label?: string | null;
  title?: string;
  hint?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <h2 className="text-2xl font-bold">
            {title ?? (label ? `「${label}」暂无新词` : "今日已清空 🎉")}
          </h2>
          <p className="text-muted-foreground">
            {hint ??
              (label
                ? "该范围内的词都已在学习队列中，换个分类或换个模式试试。"
                : "没有待复习或新学的单词，来日方长。")}
          </p>
          <Button asChild>
            <Link href="/vocab">返回词汇首页</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}