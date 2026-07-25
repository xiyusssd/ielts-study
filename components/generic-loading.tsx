import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** 通用列表/网格式页面加载骨架 */
export function ListLoading({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-7 w-32 rounded bg-muted" />
          <div className="h-4 w-56 rounded bg-muted/60" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="mt-2 h-8 w-16 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: items }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="h-5 w-3/4 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted/60" />
            </CardHeader>
            <CardContent>
              <div className="h-9 w-full rounded bg-muted/50" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
