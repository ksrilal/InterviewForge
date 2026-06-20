"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guard";
import { getAIProvider, getFallbackAIProvider } from "@/ai/provider";
import { checkAIQuota, recordAIUsage } from "@/lib/ai/usage-gate";
import { mapAnswerRowToEvaluation, mapQuestionRow } from "@/lib/mappers";
import { pickRootQuestion, pickQuestionByTypeMix, pickQuestionInDomain } from "./question.actions";
import { MAX_FOLLOW_UPS_PER_THREAD, MOCK_MODE_CONFIG } from "@/lib/scoring/mock-templates";
import type { ActionResult, Evaluation } from "@/types/domain";
import type {
  AnswerRow,
  QuestionRow,
  SessionQuestionRow,
  SessionRow,
} from "@/lib/supabase/types";

export interface SubmitAnswerResult {
  answerId: string;
  evaluation: Evaluation;
  nextStep: NextStep;
}

export type NextStep =
  | { type: "FOLLOW_UP"; sessionQuestionId: string; prompt: string; depth: number }
  | { type: "NEW_TOPIC"; sessionQuestionId: string; prompt: string }
  | { type: "SESSION_COMPLETE" };

// Saves the answer FIRST (before any AI call), per docs/01-prd.md §7 - a
// crashed AI call must never lose the user's typed answer.
export async function submitAnswer(
  sessionQuestionId: string,
  answerText: string
): Promise<ActionResult<SubmitAnswerResult>> {
  const { supabase } = await requireUser();

  const { data: answer, error: insertError } = await supabase
    .from("answers")
    .insert({ session_question_id: sessionQuestionId, answer_text: answerText })
    .select("*")
    .single();

  if (insertError || !answer) {
    return { ok: false, error: insertError?.message ?? "Failed to save answer." };
  }

  const answerRow = answer as AnswerRow;

  const evalResult = await evaluateAnswer(answerRow.id);
  if (!evalResult.ok || !evalResult.data) {
    return { ok: false, error: evalResult.error ?? "Evaluation failed.", data: undefined };
  }

  const nextStep = await advanceSession(sessionQuestionId, answerText, evalResult.data);

  return {
    ok: true,
    data: { answerId: answerRow.id, evaluation: evalResult.data, nextStep },
  };
}

// Separated so the retry flow (Flow 8 in docs/08-user-flows.md) can re-run
// evaluation on an already-saved answer without re-submitting the text.
export async function evaluateAnswer(answerId: string): Promise<ActionResult<Evaluation>> {
  const { supabase, user } = await requireUser();

  const { data: answer, error: answerError } = await supabase
    .from("answers")
    .select("*")
    .eq("id", answerId)
    .single();
  if (answerError || !answer) {
    return { ok: false, error: "Answer not found." };
  }
  const answerRow = answer as AnswerRow;

  const { data: sessionQuestion, error: sqError } = await supabase
    .from("session_questions")
    .select("*")
    .eq("id", answerRow.session_question_id)
    .single();
  if (sqError || !sessionQuestion) {
    return { ok: false, error: "Question context not found." };
  }
  const sq = sessionQuestion as SessionQuestionRow;

  const { data: session } = await supabase
    .from("sessions")
    .select("level, interviewer_personality, company_type")
    .eq("id", sq.session_id)
    .single();
  const sessionRow = session as Pick<
    SessionRow,
    "level" | "interviewer_personality" | "company_type"
  > | null;

  let questionContext: Pick<
    QuestionRow,
    "prompt" | "question_type" | "difficulty" | "level" | "scoring_rubric" | "common_mistakes"
  >;

  if (sq.question_id) {
    const { data: question } = await supabase
      .from("questions")
      .select("*")
      .eq("id", sq.question_id)
      .single();
    if (!question) return { ok: false, error: "Question not found." };
    questionContext = question as QuestionRow;
  } else {
    // AI-generated follow-up with no bank row - reconstruct minimal context
    // from the session itself for evaluation purposes.
    questionContext = {
      prompt: sq.prompt_text,
      question_type: "theory",
      difficulty: 3,
      level: sessionRow?.level ?? "mid",
      scoring_rubric: {
        accuracy: "Correctly addresses the follow-up question asked",
        depth: "Goes beyond surface-level restatement",
        completeness: "Covers the specific angle the follow-up probed",
        practicality: "Grounded in real implementation detail",
        communication: "Clear and organized",
        seniority: "Matches the target level's expected depth",
      },
      common_mistakes: [],
    };
  }

  const evaluationInput = {
    question: {
      prompt: sq.prompt_text,
      questionType: questionContext.question_type,
      difficulty: questionContext.difficulty,
      level: questionContext.level,
      scoringRubric: questionContext.scoring_rubric,
      commonMistakes: questionContext.common_mistakes,
    },
    answerText: answerRow.answer_text,
    personality: sessionRow?.interviewer_personality,
    companyType: sessionRow?.company_type,
  };

  try {
    await checkAIQuota(user.id);
  } catch (err) {
    await supabase
      .from("answers")
      .update({ evaluation_error: (err as Error).message })
      .eq("id", answerId);
    return { ok: false, error: (err as Error).message };
  }

  let evaluation: Evaluation;
  let usedProvider = getAIProvider();
  try {
    evaluation = await usedProvider.evaluateAnswer(evaluationInput);
    await recordAIUsage(user.id, usedProvider);
  } catch (primaryError) {
    const fallback = getFallbackAIProvider();
    if (!fallback) {
      await supabase
        .from("answers")
        .update({ evaluation_error: (primaryError as Error).message })
        .eq("id", answerId);
      return { ok: false, error: "Evaluation failed and no fallback provider is configured." };
    }
    try {
      usedProvider = fallback;
      evaluation = await fallback.evaluateAnswer(evaluationInput);
      await recordAIUsage(user.id, usedProvider);
    } catch (fallbackError) {
      await supabase
        .from("answers")
        .update({ evaluation_error: (fallbackError as Error).message })
        .eq("id", answerId);
      return { ok: false, error: "Evaluation failed on both configured providers." };
    }
  }

  const { error: updateError } = await supabase
    .from("answers")
    .update({
      evaluated_at: new Date().toISOString(),
      overall_score: evaluation.overallScore,
      accuracy_score: evaluation.dimensions.accuracy,
      depth_score: evaluation.dimensions.depth,
      completeness_score: evaluation.dimensions.completeness,
      practicality_score: evaluation.dimensions.practicality,
      communication_score: evaluation.dimensions.communication,
      seniority_score: evaluation.dimensions.seniority,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      missing_concepts: evaluation.missingConcepts,
      suggested_answer: evaluation.suggestedAnswer,
      interviewer_feedback: evaluation.interviewerFeedback,
      evaluation_error: null,
      ai_provider: usedProvider.name,
      ai_model: usedProvider.model,
    })
    .eq("id", answerId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true, data: evaluation };
}

// The adaptive follow-up engine (docs/01-prd.md Module 4): decides whether to
// probe deeper on the same topic, pivot to a new one, or end the session.
// The follow-up cap is enforced here in code, not just via the AI prompt.
async function advanceSession(
  sessionQuestionId: string,
  answerText: string,
  evaluation: Evaluation
): Promise<NextStep> {
  const supabase = await getSupabaseServerClient();

  const { data: sq } = await supabase
    .from("session_questions")
    .select("*")
    .eq("id", sessionQuestionId)
    .single();
  const sessionQuestion = sq as SessionQuestionRow;

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionQuestion.session_id)
    .single();
  const sessionRow = session as SessionRow;

  // interview_type's fixed categories only meaningfully describe the global
  // Software Engineering domain - a custom domain's questions are scoped by
  // domain_id + level alone (see startSession).
  const { data: domain } = await supabase
    .from("domains")
    .select("name, owner_user_id")
    .eq("id", sessionRow.domain_id)
    .single();
  const isCustomDomain = !!domain?.owner_user_id;

  const rootSessionQuestionId = await findThreadRoot(sessionQuestion);
  const { data: threadQuestions } = await supabase
    .from("session_questions")
    .select("id")
    .eq("parent_session_question_id", rootSessionQuestionId);
  const followUpCount = (threadQuestions ?? []).length;

  const { count: rootCount } = await supabase
    .from("session_questions")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionQuestion.session_id)
    .eq("follow_up_depth", 0);

  const config = MOCK_MODE_CONFIG[sessionRow.mode];
  const reachedQuestionCap = (rootCount ?? 0) >= config.rootQuestionCount;

  if (followUpCount >= MAX_FOLLOW_UPS_PER_THREAD) {
    return reachedQuestionCap
      ? { type: "SESSION_COMPLETE" }
      : await moveToNewTopic(sessionRow, rootCount ?? 0, isCustomDomain);
  }

  let rootQuestionPrompt = sessionQuestion.prompt_text;
  let expectedAnswerAreas: string[] = [];
  let followUpSeeds: string[] = [];

  if (sessionQuestion.follow_up_depth === 0 && sessionQuestion.question_id) {
    const { data: question } = await supabase
      .from("questions")
      .select("*")
      .eq("id", sessionQuestion.question_id)
      .single();
    if (question) {
      const q = mapQuestionRow(question as QuestionRow);
      rootQuestionPrompt = q.prompt;
      expectedAnswerAreas = q.expectedAnswerAreas;
      followUpSeeds = q.followUpSeeds;
    }
  }

  const provider = getAIProvider();
  let decision;
  try {
    await checkAIQuota(sessionRow.user_id);
    decision = await provider.decideFollowUp({
      level: sessionRow.level,
      interviewType: sessionRow.interview_type,
      domainName: isCustomDomain ? domain?.name : undefined,
      rootQuestionPrompt,
      expectedAnswerAreas,
      followUpSeeds,
      answerText,
      evaluation,
      followUpCount,
      maxFollowUps: MAX_FOLLOW_UPS_PER_THREAD,
      personality: sessionRow.interviewer_personality,
      companyType: sessionRow.company_type,
    });
    await recordAIUsage(sessionRow.user_id, provider);
  } catch {
    // If the follow-up decision call fails (including no AI quota left),
    // fail safe to NEW_TOPIC rather than blocking the user from continuing
    // the session - this one is a nice-to-have, unlike evaluateAnswer.
    decision = { action: "NEW_TOPIC" as const };
  }

  if (decision.action === "END_SESSION" || (decision.action === "ASK_FOLLOW_UP" && reachedQuestionCap)) {
    return { type: "SESSION_COMPLETE" };
  }

  if (decision.action === "ASK_FOLLOW_UP" && decision.followUpPrompt) {
    const { data: newSq } = await supabase
      .from("session_questions")
      .insert({
        session_id: sessionQuestion.session_id,
        question_id: null,
        parent_session_question_id: rootSessionQuestionId,
        thread_position: sessionQuestion.thread_position + 1,
        follow_up_depth: sessionQuestion.follow_up_depth + 1,
        prompt_text: decision.followUpPrompt,
      })
      .select("*")
      .single();

    if (newSq) {
      const newRow = newSq as SessionQuestionRow;
      return {
        type: "FOLLOW_UP",
        sessionQuestionId: newRow.id,
        prompt: newRow.prompt_text,
        depth: newRow.follow_up_depth,
      };
    }
  }

  if (reachedQuestionCap) {
    return { type: "SESSION_COMPLETE" };
  }
  return await moveToNewTopic(sessionRow, rootCount ?? 0, isCustomDomain);
}

async function findThreadRoot(sq: SessionQuestionRow): Promise<string> {
  if (!sq.parent_session_question_id) return sq.id;

  const supabase = await getSupabaseServerClient();
  let currentId = sq.parent_session_question_id;
  for (let i = 0; i < MAX_FOLLOW_UPS_PER_THREAD + 1; i++) {
    const { data } = await supabase
      .from("session_questions")
      .select("id, parent_session_question_id")
      .eq("id", currentId)
      .single();
    const row = data as Pick<SessionQuestionRow, "id" | "parent_session_question_id"> | null;
    if (!row || !row.parent_session_question_id) return row?.id ?? currentId;
    currentId = row.parent_session_question_id;
  }
  return currentId;
}

async function moveToNewTopic(
  sessionRow: SessionRow,
  currentRootCount: number,
  isCustomDomain: boolean
): Promise<NextStep> {
  const supabase = await getSupabaseServerClient();
  const config = MOCK_MODE_CONFIG[sessionRow.mode];

  const { data: existingSessionQuestions } = await supabase
    .from("session_questions")
    .select("question_id")
    .eq("session_id", sessionRow.id);
  const excludeIds = (existingSessionQuestions ?? [])
    .map((r) => (r as { question_id: string | null }).question_id)
    .filter((id): id is string => !!id);

  // Same reasoning as startSession: mock mode's type sequence assumes the
  // built-in domain's broad question_type coverage, which custom domains
  // rarely have - always use the domain-wide pick for those instead.
  const typeMixForNext = isCustomDomain ? undefined : config.typeSequence[currentRootCount];
  const question = typeMixForNext
    ? await pickQuestionByTypeMix(sessionRow.domain_id, sessionRow.level, [typeMixForNext], excludeIds)
    : isCustomDomain
      ? await pickQuestionInDomain(sessionRow.domain_id, sessionRow.level, excludeIds)
      : await pickRootQuestion(sessionRow.domain_id, sessionRow.level, sessionRow.interview_type, excludeIds);

  if (!question) {
    return { type: "SESSION_COMPLETE" };
  }

  const { data: newSq } = await supabase
    .from("session_questions")
    .insert({
      session_id: sessionRow.id,
      question_id: question.id,
      parent_session_question_id: null,
      thread_position: currentRootCount,
      follow_up_depth: 0,
      prompt_text: question.prompt,
    })
    .select("*")
    .single();

  if (!newSq) {
    return { type: "SESSION_COMPLETE" };
  }

  const newRow = newSq as SessionQuestionRow;
  return { type: "NEW_TOPIC", sessionQuestionId: newRow.id, prompt: newRow.prompt_text };
}

export async function getEvaluationForAnswer(sessionQuestionId: string): Promise<Evaluation | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("answers")
    .select("*")
    .eq("session_question_id", sessionQuestionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return mapAnswerRowToEvaluation(data as AnswerRow);
}
