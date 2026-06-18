"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/guard";
import { getAIProvider } from "@/ai/provider";
import { getLatestSkillSnapshots } from "./radar.actions";
import type { ActionResult, InterviewLevel, TrainingPlan } from "@/types/domain";
import type { TrainingPlanRow, SessionRow } from "@/lib/supabase/types";

const MIN_SESSIONS_FOR_PLAN = 3;

export async function getActivePlan(): Promise<TrainingPlanRow | null> {
  await requireAuth();
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("training_plans")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  return data as TrainingPlanRow | null;
}

export async function getCompletedSessionCount(): Promise<number> {
  await requireAuth();
  const supabase = getSupabaseServerClient();
  const { count } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed");
  return count ?? 0;
}

export async function generatePlan(
  targetLevel: InterviewLevel | null,
  targetDate: string | null
): Promise<ActionResult<TrainingPlan>> {
  await requireAuth();
  const supabase = getSupabaseServerClient();

  const completedCount = await getCompletedSessionCount();
  if (completedCount < MIN_SESSIONS_FOR_PLAN) {
    return {
      ok: false,
      error: `Complete at least ${MIN_SESSIONS_FOR_PLAN} sessions before generating a plan (you have ${completedCount}).`,
    };
  }

  const snapshots = await getLatestSkillSnapshots();
  const { data: recentSessions } = await supabase
    .from("sessions")
    .select("verdict")
    .eq("status", "completed")
    .not("verdict", "is", null)
    .order("started_at", { ascending: false })
    .limit(5);

  const recentVerdicts = ((recentSessions ?? []) as Pick<SessionRow, "verdict">[])
    .map((s) => s.verdict)
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const provider = getAIProvider();
  let plan: TrainingPlan;
  try {
    plan = await provider.generateTrainingPlan({
      skillSnapshots: snapshots.map((s) => ({
        axis: s.axis,
        rollingAverage: s.rollingAverage,
        sampleCount: s.sampleCount,
      })),
      targetLevel,
      targetDate,
      recentVerdicts,
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  await supabase.from("training_plans").update({ is_active: false }).eq("is_active", true);

  const { error: insertError } = await supabase.from("training_plans").insert({
    target_level: plan.targetLevel,
    target_date: plan.targetDate,
    focus_skills: plan.focusSkills,
    daily_tasks: plan.dailyTasks,
    weekly_goal: plan.weeklyGoal,
    readiness_estimate: plan.readinessEstimate,
    is_active: true,
  });

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  revalidatePath("/plan");
  return { ok: true, data: plan };
}
