"use client";

import { useEffect, useState, useTransition } from "react";
import { SkillRadarChart } from "@/components/radar/skill-radar-chart";
import { SkillTrendChart } from "@/components/radar/skill-trend-chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSkillTrend } from "@/actions/radar.actions";
import type { SkillAxis } from "@/types/domain";
import type { SkillSnapshotSummary } from "@/actions/radar.actions";

const AXIS_LABELS: Record<SkillAxis, string> = {
  architecture: "Architecture",
  system_design: "System Design",
  databases: "Databases",
  security: "Security",
  backend: "Backend",
  cloud: "Cloud",
  devops: "DevOps",
  leadership: "Leadership",
  communication: "Communication",
  ai: "AI",
};

interface RadarClientProps {
  snapshots: SkillSnapshotSummary[];
}

export function RadarClient({ snapshots }: RadarClientProps) {
  const [selectedAxis, setSelectedAxis] = useState<SkillAxis>(snapshots[0]?.axis ?? "backend");
  const [trend, setTrend] = useState<{ date: string; value: number }[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getSkillTrend(selectedAxis);
      setTrend(data);
    });
  }, [selectedAxis]);

  return (
    <div className="flex flex-col gap-6">
      <SkillRadarChart data={snapshots.map((s) => ({ axis: s.axis, rollingAverage: s.rollingAverage }))} />

      <div className="flex flex-col gap-3">
        <Tabs value={selectedAxis} onValueChange={(v) => setSelectedAxis(v as SkillAxis)}>
          <TabsList className="flex-wrap h-auto">
            {snapshots.map((s) => (
              <TabsTrigger key={s.axis} value={s.axis} className="text-xs">
                {AXIS_LABELS[s.axis]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SkillTrendChart data={trend} />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium text-muted-foreground mb-1">Breakdown</h2>
        <table className="w-full text-sm">
          <tbody>
            {snapshots.map((s) => (
              <tr key={s.axis} className="border-b border-border last:border-0">
                <td className="py-2 text-foreground">{AXIS_LABELS[s.axis]}</td>
                <td className="py-2 text-right tabular-nums font-medium">
                  {s.sampleCount > 0 ? Math.round(s.rollingAverage) : "—"}
                </td>
                <td className="py-2 pl-3 text-right text-xs text-muted-foreground w-20">
                  {s.sampleCount} sample{s.sampleCount === 1 ? "" : "s"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
