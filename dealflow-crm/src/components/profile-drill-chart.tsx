"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ProfileDrillChart({ data }: { data: { date: string; answered: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
          <XAxis dataKey="date" tick={{ fill: "var(--ink-3)", fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fill: "var(--ink-3)", fontSize: 10 }} width={28} />
          <Tooltip
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}
            labelStyle={{ color: "var(--ink)" }}
          />
          <Bar dataKey="answered" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
