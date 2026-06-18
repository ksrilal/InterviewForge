import type { QuestionType, SessionMode } from "@/types/domain";

// Question-mix templates per mock duration (docs/01-prd.md Module 6).
// Each entry is the question_type pool to draw the Nth root question from.
export const MOCK_MODE_CONFIG: Record<
  SessionMode,
  { timeLimitSeconds: number | null; rootQuestionCount: number; typeSequence: QuestionType[] }
> = {
  practice: { timeLimitSeconds: null, rootQuestionCount: 8, typeSequence: [] },
  mock_15: {
    timeLimitSeconds: 15 * 60,
    rootQuestionCount: 4,
    typeSequence: ["theory", "scenario", "debugging", "behavioral"],
  },
  mock_30: {
    timeLimitSeconds: 30 * 60,
    rootQuestionCount: 8,
    typeSequence: [
      "theory",
      "scenario",
      "architecture",
      "debugging",
      "system_design",
      "scenario",
      "behavioral",
      "theory",
    ],
  },
  mock_60: {
    timeLimitSeconds: 60 * 60,
    rootQuestionCount: 14,
    typeSequence: [
      "theory",
      "scenario",
      "architecture",
      "debugging",
      "system_design",
      "scenario",
      "behavioral",
      "theory",
      "architecture",
      "system_design",
      "debugging",
      "scenario",
      "behavioral",
      "theory",
    ],
  },
};

export const MAX_FOLLOW_UPS_PER_THREAD = 3;
