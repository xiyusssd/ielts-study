"use client";

import dynamic from "next/dynamic";
import type { Bands } from "@/lib/scoring/band-mapper";

// 懒加载 recharts（recharts 约 60KB，不阻塞首屏）
const RadarChartInner = dynamic(() => import("./band-radar-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[260px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
});

export function BandRadar({ bands, targets }: { bands: Bands; targets?: Partial<Bands> }) {
  return <RadarChartInner bands={bands} targets={targets} />;
}
