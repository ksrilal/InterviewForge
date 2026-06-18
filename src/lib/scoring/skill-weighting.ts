import type { SkillAxis } from "@/types/domain";

const ROLLING_WINDOW = 20;
const DECAY_FACTOR = 0.92; // most-recent event weighted highest, decaying backward

export interface ScoredEvent {
  score: number;
  occurredAt: string;
}

// Recency-weighted rolling average over the last N events for one skill axis
// (docs/02-database-schema.md skill_snapshots rationale).
export function computeRollingAverage(events: ScoredEvent[]): { average: number; sampleCount: number } {
  if (events.length === 0) return { average: 0, sampleCount: 0 };

  const sorted = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
  const windowed = sorted.slice(0, ROLLING_WINDOW);

  let weightedSum = 0;
  let totalWeight = 0;
  windowed.forEach((event, index) => {
    const weight = Math.pow(DECAY_FACTOR, index);
    weightedSum += event.score * weight;
    totalWeight += weight;
  });

  return {
    average: Math.round((weightedSum / totalWeight) * 100) / 100,
    sampleCount: windowed.length,
  };
}

export const ALL_SKILL_AXES: SkillAxis[] = [
  "architecture",
  "system_design",
  "databases",
  "security",
  "backend",
  "cloud",
  "devops",
  "leadership",
  "communication",
  "ai",
];
