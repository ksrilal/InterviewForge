"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guard";
import { pickRootQuestion, pickQuestionByTypeMix, pickQuestionInDomain } from "./question.actions";
import { getAIProvider } from "@/ai/provider";
import { checkAIQuota, recordAIUsage } from "@/lib/ai/usage-gate";
import { MOCK_MODE_CONFIG } from "@/lib/scoring/mock-templates";
import { computeReadinessVerdict } from "@/lib/scoring/readiness";
import { writeSkillSnapshotsForSession } from "./radar.actions";
import type {
  CompanyType,
  InterviewerPersonality,
  InterviewLevel,
  InterviewType,
  SessionMode,
  ActionResult,
} from "@/types/domain";
import type { SessionQuestionRow, SessionRow, AnswerRow } from "@/lib/supabase/types";

export interface StartSessionResult {
  sessionId: string;
  firstSessionQuestionId: string;
  firstQuestionPrompt: string;
}

export async function startSession(
  domainId: string,
  level: InterviewLevel,
  interviewType: InterviewType,
  mode: SessionMode,
  personality: InterviewerPersonality = "professional",
  companyType: CompanyType | null = null
): Promise<ActionResult<StartSessionResult>> {
  const { supabase } = await requireUser();
  const config = MOCK_MODE_CONFIG[mode];

  // interview_type's fixed categories (backend/dotnet/...) only meaningfully
  // describe the global Software Engineering domain's content - a custom
  // domain's questions are scoped by domain_id + level alone.
  const { data: domain } = await supabase
    .from("domains")
    .select("name, owner_user_id")
    .eq("id", domainId)
    .single();
  const isCustomDomain = !!domain?.owner_user_id;

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      domain_id: domainId,
      mode,
      level,
      interview_type: interviewType,
      status: "in_progress",
      time_limit_seconds: config.timeLimitSeconds,
      interviewer_personality: personality,
      company_type: companyType,
    })
    .select("*")
    .single();

  if (sessionError || !session) {
    return { ok: false, error: sessionError?.message ?? "Failed to create session." };
  }

  const sessionRow = session as SessionRow;

  // Mock mode's typeSequence (theory/debugging/architecture/...) assumes the
  // built-in Software Engineering domain's broad question_type coverage - a
  // custom domain's AI-generated questions rarely span that same variety, so
  // forcing the type filter there just fails to find anything. Custom
  // domains always use the domain-wide pick regardless of mock mode.
  const firstTypeMix = isCustomDomain ? undefined : config.typeSequence[0];
  const question = firstTypeMix
    ? await pickQuestionByTypeMix(domainId, level, [firstTypeMix], [])
    : isCustomDomain
      ? await pickQuestionInDomain(domainId, level, [])
      : await pickRootQuestion(domainId, level, interviewType, []);

  if (!question) {
    // Clean up the session row we just created - without this, a failed
    // first-question pick (e.g. an empty domain) left an orphaned
    // in_progress session with no questions, visible forever in /sessions.
    await supabase.from("sessions").delete().eq("id", sessionRow.id);
    return { ok: false, error: "No questions available for this domain/level/type combination." };
  }

  const { data: sessionQuestion, error: sqError } = await supabase
    .from("session_questions")
    .insert({
      session_id: sessionRow.id,
      question_id: question.id,
      parent_session_question_id: null,
      thread_position: 0,
      follow_up_depth: 0,
      prompt_text: question.prompt,
    })
    .select("*")
    .single();

  if (sqError || !sessionQuestion) {
    await supabase.from("sessions").delete().eq("id", sessionRow.id);
    return { ok: false, error: sqError?.message ?? "Failed to create first question." };
  }

  const sq = sessionQuestion as SessionQuestionRow;

  return {
    ok: true,
    data: {
      sessionId: sessionRow.id,
      firstSessionQuestionId: sq.id,
      firstQuestionPrompt: sq.prompt_text,
    },
  };
}

export interface EndSessionResult {
  overallScore: number;
  verdict: SessionRow["verdict"];
}

export async function endSession(sessionId: string): Promise<ActionResult<EndSessionResult>> {
  const { supabase, user } = await requireUser();

  const { data: session, error: sessionFetchError } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionFetchError || !session) {
    return { ok: false, error: "Session not found." };
  }
  const sessionRow = session as SessionRow;

  const { data: sessionQuestions } = await supabase
    .from("session_questions")
    .select("id")
    .eq("session_id", sessionId);

  const sqIds = (sessionQuestions ?? []).map((r) => (r as { id: string }).id);

  const { data: answers } = sqIds.length
    ? await supabase
        .from("answers")
        .select("*")
        .in("session_question_id", sqIds)
        .not("overall_score", "is", null)
    : { data: [] as AnswerRow[] };

  const answerRows = (answers ?? []) as AnswerRow[];
  const scores = answerRows.map((a) => a.overall_score as number);
  const overallScore =
    scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0;

  const isMockMode = sessionRow.mode !== "practice";
  const verdict = isMockMode ? computeReadinessVerdict(overallScore, answerRows) : null;

  const allStrengths = answerRows.flatMap((a) => a.strengths ?? []);
  const allWeaknesses = answerRows.flatMap((a) => a.weaknesses ?? []);
  const allMissing = answerRows.flatMap((a) => a.missing_concepts ?? []);

  const provider = getAIProvider();

  let narrative = "Session completed.";
  try {
    await checkAIQuota(user.id);
    const narrativeResult = await provider.evaluateAnswer({
      question: {
        prompt: "Summarize this candidate's overall interview session performance in 2-3 sentences.",
        questionType: "theory",
        difficulty: 1,
        level: sessionRow.level,
        scoringRubric: { accuracy: "n/a", depth: "n/a", completeness: "n/a", practicality: "n/a", communication: "n/a", seniority: "n/a" },
        commonMistakes: [],
      },
      answerText: `Strengths observed: ${allStrengths.join("; ")}. Weaknesses observed: ${allWeaknesses.join("; ")}. Missing concepts: ${allMissing.join("; ")}. Overall score: ${overallScore}.`,
      personality: sessionRow.interviewer_personality,
      companyType: sessionRow.company_type,
    });
    await recordAIUsage(user.id, provider);
    narrative = narrativeResult.interviewerFeedback || narrative;
  } catch {
    // Narrative generation is a nice-to-have (including when AI quota is
    // exhausted); session completion must not fail because of it.
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      overall_score: overallScore,
      verdict,
      ai_provider: provider.name,
      ai_model: provider.model,
      summary: {
        strengths: Array.from(new Set(allStrengths)).slice(0, 5),
        weaknesses: Array.from(new Set(allWeaknesses)).slice(0, 5),
        missingConcepts: Array.from(new Set(allMissing)).slice(0, 5),
        narrative,
      },
    })
    .eq("id", sessionId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await writeSkillSnapshotsForSession(sessionId);

  revalidatePath("/dashboard");
  revalidatePath("/sessions");
  revalidatePath("/radar");

  return { ok: true, data: { overallScore, verdict } };
}

export async function abandonSession(sessionId: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase
    .from("sessions")
    .update({ status: "abandoned", ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  revalidatePath("/dashboard");
}

// session_questions/answers/skill_score_events all cascade-delete from
// sessions (see 0001_init.sql), so deleting the session row alone removes
// its full history. RLS already scopes "sessions" to the caller's own rows
// (0004_multi_tenant_foundation.sql), so this can't touch another user's
// session even without an explicit user_id filter here.
export async function deleteSession(sessionId: string): Promise<ActionResult<void>> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  revalidatePath("/radar");
  return { ok: true };
}
