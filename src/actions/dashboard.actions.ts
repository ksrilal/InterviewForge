"use server";

import { requireUser } from "@/lib/auth/guard";
import { getLatestSkillSnapshots } from "./radar.actions";
import { computeWeightedReadiness } from "@/lib/scoring/readiness";
import type { DomainRow, SessionRow } from "@/lib/supabase/types";

export interface DashboardData {
  readinessScore: number;
  readinessLevel: string;
  readinessStatus: "pass" | "borderline" | "fail" | "no-data";
  // Single page-level flag rather than per-row - recentSessions is now
  // domain-scoped, so every row already shares the same domain.
  isCustomDomain: boolean;
  recentSessions: {
    id: string;
    level: string;
    interviewType: string;
    overallScore: number | null;
    verdict: "pass" | "borderline" | "fail" | null;
  }[];
}

// Domain-scoped: the skill radar/readiness score behind this only makes
// sense within one domain at a time (see radar.actions.ts), so "recent
// activity" on the dashboard follows the same selected domain rather than
// mixing in unrelated domains' sessions.
export async function getDashboardData(domainId: string): Promise<DashboardData> {
  const { supabase } = await requireUser();

  const { data: domain } = await supabase
    .from("domains")
    .select("owner_user_id")
    .eq("id", domainId)
    .single();
  const isCustomDomain = !!(domain as Pick<DomainRow, "owner_user_id"> | null)?.owner_user_id;

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("domain_id", domainId)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(5);

  const sessionRows = (sessions ?? []) as SessionRow[];
  const latestLevel = sessionRows[0]?.level ?? "senior";

  const snapshots = await getLatestSkillSnapshots(domainId);
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
    isCustomDomain,
    recentSessions: sessionRows.map((s) => ({
      id: s.id,
      level: s.level,
      interviewType: s.interview_type,
      overallScore: s.overall_score,
      verdict: s.verdict,
    })),
  };
}
