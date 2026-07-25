import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** Dashboard 全局 loading，防止点击后感觉卡住 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 rounded-2xl bg-brand-soft" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="h-6 w-32 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-32 rounded bg-muted/50" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
