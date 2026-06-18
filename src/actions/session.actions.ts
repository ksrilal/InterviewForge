"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/guard";
import { pickRootQuestion, pickQuestionByTypeMix } from "./question.actions";
import { getAIProvider } from "@/ai/provider";
import { MOCK_MODE_CONFIG } from "@/lib/scoring/mock-templates";
import { computeReadinessVerdict } from "@/lib/scoring/readiness";
import { writeSkillSnapshotsForSession } from "./radar.actions";
import type {
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
  level: InterviewLevel,
  interviewType: InterviewType,
  mode: SessionMode
): Promise<ActionResult<StartSessionResult>> {
  await requireAuth();
  const supabase = getSupabaseServerClient();
  const config = MOCK_MODE_CONFIG[mode];

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      mode,
      level,
      interview_type: interviewType,
      status: "in_progress",
      time_limit_seconds: config.timeLimitSeconds,
    })
    .select("*")
    .single();

  if (sessionError || !session) {
    return { ok: false, error: sessionError?.message ?? "Failed to create session." };
  }

  const sessionRow = session as SessionRow;

  const firstTypeMix = config.typeSequence[0];
  const question = firstTypeMix
    ? await pickQuestionByTypeMix(level, [firstTypeMix], [])
    : await pickRootQuestion(level, interviewType, []);

  if (!question) {
    return { ok: false, error: "No questions available for this level/type combination." };
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
  await requireAuth();
  const supabase = getSupabaseServerClient();

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
    });
    narrative = narrativeResult.interviewerFeedback || narrative;
  } catch {
    // Narrative generation is a nice-to-have; session completion must not fail because of it.
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
  await requireAuth();
  const supabase = getSupabaseServerClient();
  await supabase
    .from("sessions")
    .update({ status: "abandoned", ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  revalidatePath("/dashboard");
}
