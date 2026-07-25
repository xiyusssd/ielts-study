"use client";

import dynamic from "next/dynamic";

export type TrendPoint = {
  date: string;
  阅读?: number;
  听力?: number;
  写作?: number;
  口语?: number;
};

const TrendLineInner = dynamic(() => import("./trend-line-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[220px] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
});

export function TrendLine({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">尚无历史数据</div>;
  }
  return <TrendLineInner data={data} />;
}
