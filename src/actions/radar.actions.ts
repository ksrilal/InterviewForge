"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guard";
import { computeRollingAverage, ALL_SKILL_AXES } from "@/lib/scoring/skill-weighting";
import type {
  SkillScoreEventRow,
  SkillSnapshotRow,
  AnswerRow,
  SessionQuestionRow,
  SessionRow,
  DomainRow,
  QuestionRow,
} from "@/lib/supabase/types";

type SupabaseClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

// The global Software Engineering domain keeps its fixed, well-known axis
// list (so its radar still shows a full skeleton with zero history). Custom
// domains have no fixed list - their axes are whatever the AI invented for
// that domain's own questions. Read straight from the question bank
// (skill_axes), not from skill_snapshots/skill_score_events - those only
// get written once a session is completed and scored, which would leave a
// brand new custom domain's radar empty even though its questions (and
// their axes) already exist from domain creation.
async function resolveDomainAxes(supabase: SupabaseClient, domainId: string): Promise<string[]> {
  const { data: domain } = await supabase
    .from("domains")
    .select("owner_user_id")
    .eq("id", domainId)
    .single();
  const isCustomDomain = !!(domain as Pick<DomainRow, "owner_user_id"> | null)?.owner_user_id;
  if (!isCustomDomain) return ALL_SKILL_AXES;

  const { data } = await supabase
    .from("questions")
    .select("skill_axes")
    .eq("domain_id", domainId);
  const axes = new Set(((data ?? []) as Pick<QuestionRow, "skill_axes">[]).flatMap((r) => r.skill_axes));
  return Array.from(axes).sort();
}

// Called by endSession: fans out each evaluated answer's score into
// skill_score_events per skill_axis the question touched, then writes one
// skill_snapshots row per axis with the freshly computed rolling average.
// Scoped to the session's domain throughout - skill axes (architecture,
// system_design, ...) are an SE-flavored taxonomy, so blending scores across
// unrelated domains would produce a meaningless combined radar.
export async function writeSkillSnapshotsForSession(sessionId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("domain_id")
    .eq("id", sessionId)
    .single();
  const domainId = (session as Pick<SessionRow, "domain_id"> | null)?.domain_id;
  if (!domainId) return;

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

  const eventsToInsert: Omit<SkillScoreEventRow, "id" | "occurred_at" | "user_id">[] = [];

  for (const answer of answerRows) {
    const questionId = sqToQuestionId.get(answer.session_question_id);
    const question = questionId ? questionMap.get(questionId) : undefined;
    if (!question) continue;

    for (const axis of question.skill_axes) {
      eventsToInsert.push({
        domain_id: domainId,
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

  // Recompute rolling averages only for axes this session actually touched
  // (using all history within this domain, not just this session and not
  // other domains) - works for both the fixed SE axis list and whatever
  // free-text axes a custom domain's questions carry, with no branching
  // needed here since we're only ever looking at axes that already exist.
  const touchedAxes = new Set(eventsToInsert.map((e) => e.skill_axis));
  for (const axis of touchedAxes) {
    const { data: axisEvents } = await supabase
      .from("skill_score_events")
      .select("score, occurred_at")
      .eq("domain_id", domainId)
      .eq("skill_axis", axis)
      .order("occurred_at", { ascending: false })
      .limit(50);

    const events = (axisEvents ?? []) as Pick<SkillScoreEventRow, "score" | "occurred_at">[];
    if (events.length === 0) continue;

    const { average, sampleCount } = computeRollingAverage(
      events.map((e) => ({ score: e.score, occurredAt: e.occurred_at }))
    );

    await supabase.from("skill_snapshots").insert({
      domain_id: domainId,
      skill_axis: axis,
      rolling_average: average,
      sample_count: sampleCount,
    });
  }
}

export interface SkillSnapshotSummary {
  axis: string;
  rollingAverage: number;
  sampleCount: number;
}

export async function getLatestSkillSnapshots(domainId: string): Promise<SkillSnapshotSummary[]> {
  const { supabase } = await requireUser();
  const axes = await resolveDomainAxes(supabase, domainId);

  // One query per axis, but they're independent - running them in parallel
  // instead of awaiting each in a loop turns N sequential round-trips into
  // one batch, which was the single biggest contributor to dashboard/radar
  // load time (an axis count of ~9 meant ~9x the necessary latency here).
  const rows = await Promise.all(
    axes.map((axis) =>
      supabase
        .from("skill_snapshots")
        .select("*")
        .eq("domain_id", domainId)
        .eq("skill_axis", axis)
        .order("snapshot_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => data as SkillSnapshotRow | null)
    )
  );

  return axes.map((axis, i) => ({
    axis,
    rollingAverage: rows[i]?.rolling_average ?? 0,
    sampleCount: rows[i]?.sample_count ?? 0,
  }));
}

export async function getSkillTrend(
  axis: string,
  domainId: string
): Promise<{ date: string; value: number }[]> {
  const { supabase } = await requireUser();

  const { data } = await supabase
    .from("skill_snapshots")
    .select("rolling_average, snapshot_at")
    .eq("domain_id", domainId)
    .eq("skill_axis", axis)
    .order("snapshot_at", { ascending: true })
    .limit(50);

  return ((data ?? []) as Pick<SkillSnapshotRow, "rolling_average" | "snapshot_at">[]).map((row) => ({
    date: row.snapshot_at,
    value: row.rolling_average,
  }));
}
