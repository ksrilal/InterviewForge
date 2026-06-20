export type {
  InterviewLevel,
  InterviewType,
  QuestionType,
  CodeLanguage,
  SessionMode,
  SessionStatus,
  SessionVerdict,
  SkillAxis,
  InterviewerPersonality,
  CompanyType,
} from "@/lib/supabase/types";

import type { InterviewLevel, QuestionType, SkillAxis, CodeLanguage } from "@/lib/supabase/types";

export interface Question {
  id: string;
  domainId: string;
  category: string;
  topic: string;
  questionType: QuestionType;
  difficulty: number;
  level: InterviewLevel;
  // string[], not InterviewType[] - custom-domain questions leave this
  // empty (see knowledge-extraction.prompt.ts), so it can't be the strict
  // SE-only union.
  interviewTypes: string[];
  // Free text - see QuestionRow.skill_axes.
  skillAxes: string[];
  prompt: string;
  expectedAnswerAreas: string[];
  commonMistakes: string[];
  followUpSeeds: string[];
  scoringRubric: Record<string, string>;
  source: "seed" | "ai_generated" | "manual";
  // Only set when questionType is "coding".
  language: CodeLanguage | null;
}

export interface Evaluation {
  overallScore: number;
  dimensions: {
    accuracy: number;
    depth: number;
    completeness: number;
    practicality: number;
    communication: number;
    seniority: number;
  };
  strengths: string[];
  weaknesses: string[];
  missingConcepts: string[];
  suggestedAnswer: string;
  interviewerFeedback: string;
}

// Output of the AI Code Review pipeline (Coding Workspace feature) - a
// static, read-through review of submitted code, deliberately NOT modeled
// as "did this compile/run". Every field here must be presentable under one
// of three labels: AI Code Review, Static Analysis, Interview Evaluation
// (see code-review.prompt.ts and CodeReviewPanel). Architected separately
// from Evaluation so a future real execution engine (Judge0/Piston) can add
// its own result type alongside this one without reshaping it.
export interface CodeReviewResult {
  overallAssessment: string;
  syntaxIssues: string[];
  bugs: string[];
  performanceConcerns: string[];
  securityConcerns: string[];
  maintainabilityFeedback: string[];
  codeQualityNotes: string[];
  suggestedImprovements: string[];
  exampleOptimizedSolution: string;
  interviewerFeedback: string;
}

export type FollowUpAction = "ASK_FOLLOW_UP" | "NEW_TOPIC" | "END_SESSION";

export interface FollowUpDecision {
  action: FollowUpAction;
  followUpPrompt?: string;
}

export interface GeneratedQuestion {
  category: string;
  topic: string;
  questionType: QuestionType;
  difficulty: number;
  level: InterviewLevel;
  interviewTypes: string[];
  skillAxes: string[];
  prompt: string;
  expectedAnswerAreas: string[];
  commonMistakes: string[];
  followUpSeeds: string[];
  scoringRubric: Record<string, string>;
  // Only set when questionType is "coding".
  language: CodeLanguage | null;
}

export interface KnowledgeExtractionResult {
  questions: GeneratedQuestion[];
}

export interface TrainingPlan {
  targetLevel: InterviewLevel | null;
  targetDate: string | null;
  focusSkills: SkillAxis[];
  dailyTasks: { day: string; tasks: string[] }[];
  weeklyGoal: string;
  readinessEstimate: {
    scoreNow: number;
    scoreTarget: number;
    projectedReadyDate: string | null;
  } | null;
}

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
