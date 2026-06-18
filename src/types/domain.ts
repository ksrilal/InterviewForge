export type {
  InterviewLevel,
  InterviewType,
  QuestionType,
  SessionMode,
  SessionStatus,
  SessionVerdict,
  SkillAxis,
} from "@/lib/supabase/types";

import type {
  InterviewLevel,
  InterviewType,
  QuestionType,
  SkillAxis,
} from "@/lib/supabase/types";

export interface Question {
  id: string;
  category: string;
  topic: string;
  questionType: QuestionType;
  difficulty: number;
  level: InterviewLevel;
  interviewTypes: InterviewType[];
  skillAxes: SkillAxis[];
  prompt: string;
  expectedAnswerAreas: string[];
  commonMistakes: string[];
  followUpSeeds: string[];
  scoringRubric: Record<string, string>;
  source: "seed" | "ai_generated" | "manual";
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
  interviewTypes: InterviewType[];
  skillAxes: SkillAxis[];
  prompt: string;
  expectedAnswerAreas: string[];
  commonMistakes: string[];
  followUpSeeds: string[];
  scoringRubric: Record<string, string>;
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
