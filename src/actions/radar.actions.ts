"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/guard";
import { computeRollingAverage, ALL_SKILL_AXES } from "@/lib/scoring/skill-weighting";
import type { SkillAxis } from "@/types/domain";
import type { SkillScoreEventRow, SkillSnapshotRow, AnswerRow, SessionQuestionRow, QuestionRow } from "@/lib/supabase/types";

// Called by endSession: fans out each evaluated answer's score into
// skill_score_events per skill_axis the question touched, then writes one
// skill_snapshots row per axis with the freshly computed rolling average.
export async function writeSkillSnapshotsForSession(sessionId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: sessionQuestions } = await supabase
    .from("session_questions")
    .select("id, question_id")
    .eq("session_id", sessionId);

  const sqRows = (sessionQuestions ?? []) as Pick<SessionQuestionRow, "id" | "question_id">[];
  const sqIds = sqRows.map((r) => r.id);
  if (sqIds.length === 0) return;

  const { data: answers } = await supabase
    .from("answers")
    .select("*")
    .in("session_question_id", sqIds)
    .not("overall_score", "is", null);

  const answerRows = (answers ?? []) as AnswerRow[];
  if (answerRows.length === 0) return;

  const questionIds = sqRows.map((r) => r.question_id).filter((id): id is string => !!id);
  const { data: questions } = questionIds.length
    ? await supabase.from("questions").select("id, skill_axes, level").in("id", questionIds)
    : { data: [] };

  const questionMap = new Map(
    ((questions ?? []) as Pick<QuestionRow, "id" | "skill_axes" | "level">[]).map((q) => [q.id, q])
  );
  const sqToQuestionId = new Map(sqRows.map((r) => [r.id, r.question_id]));

  const eventsToInsert: Omit<SkillScoreEventRow, "id" | "occurred_at">[] = [];

  for (const answer of answerRows) {
    const questionId = sqToQuestionId.get(answer.session_question_id);
    const question = questionId ? questionMap.get(questionId) : undefined;
    if (!question) continue;

    for (const axis of question.skill_axes) {
      eventsToInsert.push({
        answer_id: answer.id,
        skill_axis: axis,
        score: answer.overall_score as number,
        level: question.level,
      });
    }
  }

  if (eventsToInsert.length > 0) {
    await supabase.from("skill_score_events").insert(eventsToInsert);
  }

  // Recompute rolling averages per axis using all history, not just this session.
  for (const axis of ALL_SKILL_AXES) {
    const { data: axisEvents } = await supabase
      .from("skill_score_events")
      .select("score, occurred_at")
      .eq("skill_axis", axis)
      .order("occurred_at", { ascending: false })
      .limit(50);

    const events = (axisEvents ?? []) as Pick<SkillScoreEventRow, "score" | "occurred_at">[];
    if (events.length === 0) continue;

    const { average, sampleCount } = computeRollingAverage(
      events.map((e) => ({ score: e.score, occurredAt: e.occurred_at }))
    );

    await supabase.from("skill_snapshots").insert({
      skill_axis: axis,
      rolling_average: average,
      sample_count: sampleCount,
    });
  }
}

export interface SkillSnapshotSummary {
  axis: SkillAxis;
  rollingAverage: number;
  sampleCount: number;
}

export async function getLatestSkillSnapshots(): Promise<SkillSnapshotSummary[]> {
  await requireAuth();
  const supabase = getSupabaseServerClient();

  const results: SkillSnapshotSummary[] = [];
  for (const axis of ALL_SKILL_AXES) {
    const { data } = await supabase
      .from("skill_snapshots")
      .select("*")
      .eq("skill_axis", axis)
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const row = data as SkillSnapshotRow | null;
    results.push({
      axis,
      rollingAverage: row?.rolling_average ?? 0,
      sampleCount: row?.sample_count ?? 0,
    });
  }

  return results;
}

export async function getSkillTrend(axis: SkillAxis): Promise<{ date: string; value: number }[]> {
  await requireAuth();
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from("skill_snapshots")
    .select("rolling_average, snapshot_at")
    .eq("skill_axis", axis)
    .order("snapshot_at", { ascending: true })
    .limit(50);

  return ((data ?? []) as Pick<SkillSnapshotRow, "rolling_average" | "snapshot_at">[]).map((row) => ({
    date: row.snapshot_at,
    value: row.rolling_average,
  }));
}
