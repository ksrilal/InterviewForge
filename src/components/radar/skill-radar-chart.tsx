"use client";

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

const AXIS_LABELS: Record<string, string> = {
  architecture: "Architecture",
  system_design: "System Design",
  databases: "Databases",
  security: "Security",
  backend: "Backend",
  cloud: "Cloud",
  devops: "DevOps",
  leadership: "Leadership",
  communication: "Communication",
};

interface SkillRadarChartProps {
  data: { axis: string; rollingAverage: number }[];
}

export function SkillRadarChart({ data }: SkillRadarChartProps) {
  const chartData = data.map((d) => ({
    axis: AXIS_LABELS[d.axis] ?? d.axis,
    score: d.rollingAverage,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart data={chartData}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="score"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.3}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
