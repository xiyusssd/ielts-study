"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { TrendPoint } from "./trend-line";

export default function TrendLineInner({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="date" fontSize={11} />
        <YAxis domain={[3, 9]} fontSize={11} width={30} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="阅读" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="听力" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="写作" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="口语" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
