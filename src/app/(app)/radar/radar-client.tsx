"use client";

import { useEffect, useState, useTransition } from "react";
import { SkillRadarChart } from "@/components/radar/skill-radar-chart";
import { SkillTrendChart } from "@/components/radar/skill-trend-chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSkillTrend } from "@/actions/radar.actions";
import type { SkillSnapshotSummary } from "@/actions/radar.actions";

// Known short codes for the global Software Engineering domain get a nicer
// label; custom domains' AI-invented axes (e.g. "Space Planning") are
// already human-readable and render as-is.
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
  ai: "AI",
};

function axisLabel(axis: string): string {
  return AXIS_LABELS[axis] ?? axis;
}

interface RadarClientProps {
  snapshots: SkillSnapshotSummary[];
  domainId: string;
}

export function RadarClient({ snapshots, domainId }: RadarClientProps) {
  const [selectedAxis, setSelectedAxis] = useState<string | undefined>(snapshots[0]?.axis);
  const [trend, setTrend] = useState<{ date: string; value: number }[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedAxis) return;
    startTransition(async () => {
      const data = await getSkillTrend(selectedAxis, domainId);
      setTrend(data);
    });
  }, [selectedAxis, domainId]);

  if (snapshots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No skill data yet for this domain - complete a session to see your radar.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SkillRadarChart data={snapshots.map((s) => ({ axis: s.axis, rollingAverage: s.rollingAverage }))} />

      <div className="flex flex-col gap-3">
        <Select value={selectedAxis} onValueChange={(v) => v && setSelectedAxis(v)}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select a skill">
              {(value: string | null) => (value ? axisLabel(value) : "Select a skill")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {snapshots.map((s) => (
              <SelectItem key={s.axis} value={s.axis}>
                {axisLabel(s.axis)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending ? <Skeleton className="h-56 w-full rounded-xl" /> : <SkillTrendChart data={trend} />}
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium text-muted-foreground mb-1">Breakdown</h2>
        <table className="w-full text-sm">
          <tbody>
            {snapshots.map((s) => (
              <tr key={s.axis} className="border-b border-border last:border-0">
                <td className="py-2 text-foreground">{axisLabel(s.axis)}</td>
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
