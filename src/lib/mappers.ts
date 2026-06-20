import type { QuestionRow, AnswerRow } from "@/lib/supabase/types";
import type { Question, Evaluation, CodeReviewResult } from "@/types/domain";

export function mapQuestionRow(row: QuestionRow): Question {
  return {
    id: row.id,
    domainId: row.domain_id,
    category: row.category,
    topic: row.topic,
    questionType: row.question_type,
    difficulty: row.difficulty,
    level: row.level,
    interviewTypes: row.interview_types,
    skillAxes: row.skill_axes,
    prompt: row.prompt,
    expectedAnswerAreas: row.expected_answer_areas,
    commonMistakes: row.common_mistakes,
    followUpSeeds: row.follow_up_seeds,
    scoringRubric: row.scoring_rubric,
    source: row.source,
    language: row.language,
  };
}

export function mapAnswerRowToEvaluation(row: AnswerRow): Evaluation | null {
  if (row.overall_score === null) return null;
  return {
    overallScore: row.overall_score,
    dimensions: {
      accuracy: row.accuracy_score ?? 0,
      depth: row.depth_score ?? 0,
      completeness: row.completeness_score ?? 0,
      practicality: row.practicality_score ?? 0,
      communication: row.communication_score ?? 0,
      seniority: row.seniority_score ?? 0,
    },
    strengths: row.strengths ?? [],
    weaknesses: row.weaknesses ?? [],
    missingConcepts: row.missing_concepts ?? [],
    suggestedAnswer: row.suggested_answer ?? "",
    interviewerFeedback: row.interviewer_feedback ?? "",
  };
}

export function mapAnswerRowToCodeReview(row: AnswerRow): CodeReviewResult | null {
  if (!row.code_review) return null;
  return row.code_review as unknown as CodeReviewResult;
}
