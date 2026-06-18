import type { AnswerRow } from "@/lib/supabase/types";
import type { SessionVerdict } from "@/types/domain";

const PASS_THRESHOLD = 75;
const BORDERLINE_THRESHOLD = 55;
const HARD_FAIL_DIMENSION_THRESHOLD = 30;

// docs/01-prd.md Module 6: verdict is overall_score thresholds AND a hard-fail
// override if any single answer scored critically low on a dimension.
export function computeReadinessVerdict(overallScore: number, answers: AnswerRow[]): SessionVerdict {
  const hasHardFail = answers.some((a) => {
    const dims = [
      a.accuracy_score,
      a.depth_score,
      a.completeness_score,
      a.practicality_score,
      a.communication_score,
      a.seniority_score,
    ];
    return dims.some((d) => d !== null && d < HARD_FAIL_DIMENSION_THRESHOLD);
  });

  if (hasHardFail) return "fail";
  if (overallScore >= PASS_THRESHOLD) return "pass";
  if (overallScore >= BORDERLINE_THRESHOLD) return "borderline";
  return "fail";
}

// Composite readiness score for the dashboard - a weighted blend of recent
// skill snapshot averages. Staff/Tech Lead weight Architecture/Leadership
// higher than Mid (docs/01-prd.md Module 5).
const LEVEL_WEIGHTS: Record<string, Partial<Record<string, number>>> = {
  staff: { architecture: 1.5, leadership: 1.5, system_design: 1.3 },
  tech_lead: { architecture: 1.4, leadership: 1.6, communication: 1.3 },
};

export function computeWeightedReadiness(
  snapshots: { axis: string; rollingAverage: number }[],
  targetLevel: string
): number {
  if (snapshots.length === 0) return 0;
  const weights = LEVEL_WEIGHTS[targetLevel] ?? {};

  let totalWeight = 0;
  let weightedSum = 0;
  for (const snap of snapshots) {
    const weight = weights[snap.axis] ?? 1;
    weightedSum += snap.rollingAverage * weight;
    totalWeight += weight;
  }

  return Math.round((weightedSum / totalWeight) * 100) / 100;
}
