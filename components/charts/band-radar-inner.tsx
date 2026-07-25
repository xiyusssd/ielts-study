"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { Bands } from "@/lib/scoring/band-mapper";

const LABELS: Record<keyof Bands, string> = {
  vocab: "词汇量",
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
};

export default function BandRadarInner({ bands, targets }: { bands: Bands; targets?: Partial<Bands> }) {
  const data = (Object.keys(LABELS) as (keyof Bands)[]).map((k) => ({
    dim: LABELS[k],
    当前: bands[k] || 0,
    目标: (targets?.[k] as number | undefined) ?? undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="80%">
        <PolarGrid />
        <PolarAngleAxis dataKey="dim" fontSize={12} />
        <PolarRadiusAxis angle={90} domain={[0, 9]} tickCount={10} tick={{ fontSize: 10 }} />
        <Radar name="当前" dataKey="当前" stroke="hsl(243 75% 59%)" fill="hsl(243 75% 59%)" fillOpacity={0.35} />
        {targets && (
          <Radar name="目标" dataKey="目标" stroke="hsl(142 71% 45%)" fill="hsl(142 71% 45%)" fillOpacity={0.15} />
        )}
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}
