import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-7 w-32 rounded bg-muted" />
          <div className="h-4 w-48 rounded bg-muted/60" />
        </div>
      </div>
      <div className="h-32 rounded-xl bg-brand-soft/60" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-24 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 rounded bg-muted" />
              <div className="mt-3 space-y-2">
                {[1, 2, 3].map((j) => <div key={j} className="h-4 w-full rounded bg-muted/50" />)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
