"use client";

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface SkillTrendChartProps {
  data: { date: string; value: number }[];
}

export function SkillTrendChart({ data }: SkillTrendChartProps) {
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    value: d.value,
  }));

  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Not enough history yet.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={28} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: 12,
            }}
          />
          <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
