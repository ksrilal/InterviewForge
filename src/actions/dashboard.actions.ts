"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/guard";
import { getLatestSkillSnapshots } from "./radar.actions";
import { computeWeightedReadiness } from "@/lib/scoring/readiness";
import type { SessionRow } from "@/lib/supabase/types";

export interface DashboardData {
  readinessScore: number;
  readinessLevel: string;
  readinessStatus: "pass" | "borderline" | "fail" | "no-data";
  recentSessions: {
    id: string;
    level: string;
    interviewType: string;
    overallScore: number | null;
    verdict: "pass" | "borderline" | "fail" | null;
  }[];
}

export async function getDashboardData(): Promise<DashboardData> {
  await requireAuth();
  const supabase = getSupabaseServerClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(5);

  const sessionRows = (sessions ?? []) as SessionRow[];
  const latestLevel = sessionRows[0]?.level ?? "senior";

  const snapshots = await getLatestSkillSnapshots();
  const hasAnyData = snapshots.some((s) => s.sampleCount > 0);
  const readinessScore = hasAnyData ? computeWeightedReadiness(snapshots, latestLevel) : 0;

  let readinessStatus: DashboardData["readinessStatus"] = "no-data";
  if (hasAnyData) {
    if (readinessScore >= 75) readinessStatus = "pass";
    else if (readinessScore >= 55) readinessStatus = "borderline";
    else readinessStatus = "fail";
  }

  return {
    readinessScore,
    readinessLevel: latestLevel,
    readinessStatus,
    recentSessions: sessionRows.map((s) => ({
      id: s.id,
      level: s.level,
      interviewType: s.interview_type,
      overallScore: s.overall_score,
      verdict: s.verdict,
    })),
  };
}
