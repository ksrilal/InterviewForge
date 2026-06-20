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
  inProgressSession: { id: string; level: string; interviewType: string } | null;
  recentSessions: {
    id: string;
    level: string;
    interviewType: string;
    status: "in_progress" | "completed" | "abandoned";
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

  // None of these four depend on each other's results (getLatestSkillSnapshots
  // only needs domainId, not the sessions data) - running them in parallel
  // instead of awaiting one after another was the main cause of the
  // dashboard taking 3+ seconds to load per domain switch.
  const [{ data: domain }, { data: inProgress }, { data: sessions }, snapshots] = await Promise.all([
    supabase.from("domains").select("owner_user_id").eq("id", domainId).single(),
    supabase
      .from("sessions")
      .select("*")
      .eq("domain_id", domainId)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("*")
      .eq("domain_id", domainId)
      .order("started_at", { ascending: false })
      .limit(3),
    getLatestSkillSnapshots(domainId),
  ]);

  const isCustomDomain = !!(domain as Pick<DomainRow, "owner_user_id"> | null)?.owner_user_id;
  const inProgressRow = inProgress as SessionRow | null;

  const sessionRows = (sessions ?? []) as SessionRow[];
  const latestCompletedLevel = sessionRows.find((s) => s.status === "completed")?.level;
  const latestLevel = inProgressRow?.level ?? latestCompletedLevel ?? "senior";

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
    inProgressSession: inProgressRow
      ? { id: inProgressRow.id, level: inProgressRow.level, interviewType: inProgressRow.interview_type }
      : null,
    recentSessions: sessionRows.map((s) => ({
      id: s.id,
      level: s.level,
      interviewType: s.interview_type,
      status: s.status,
      overallScore: s.overall_score,
      verdict: s.verdict,
    })),
  };
}
