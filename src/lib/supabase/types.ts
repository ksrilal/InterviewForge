// Hand-written to match supabase/migrations/0001_init.sql exactly.
// Regenerate with `supabase gen types typescript` once a live project exists,
// then diff against this file before replacing it.
//
// NOTE: every row shape below uses `type` (not `interface`) deliberately -
// supabase-js's GenericTable constrains Row to `Record<string, unknown>`,
// and a plain `interface` is not structurally assignable to that, which
// silently collapses every Insert/Update call to `never`. `type` aliases are.

export type InterviewLevel = "junior" | "mid" | "senior" | "staff" | "tech_lead";

export type InterviewType =
  | "backend"
  | "full_stack"
  | "dotnet"
  | "architecture"
  | "system_design"
  | "cloud"
  | "devops"
  | "behavioral"
  | "ai";

export type QuestionType =
  | "theory"
  | "scenario"
  | "debugging"
  | "architecture"
  | "system_design"
  | "behavioral";

export type SessionMode = "practice" | "mock_15" | "mock_30" | "mock_60";

export type SessionStatus = "in_progress" | "completed" | "abandoned";

export type SessionVerdict = "pass" | "borderline" | "fail";

export type SkillAxis =
  | "architecture"
  | "system_design"
  | "databases"
  | "security"
  | "backend"
  | "cloud"
  | "devops"
  | "leadership"
  | "communication"
  | "ai";

export type QuestionRow = {
  id: string;
  category: string;
  topic: string;
  question_type: QuestionType;
  difficulty: number;
  level: InterviewLevel;
  interview_types: InterviewType[];
  skill_axes: SkillAxis[];
  prompt: string;
  expected_answer_areas: string[];
  common_mistakes: string[];
  follow_up_seeds: string[];
  scoring_rubric: Record<string, string>;
  source: "seed" | "ai_generated" | "manual";
  created_at: string;
  updated_at: string;
};

export type SessionSummary = {
  strengths: string[];
  weaknesses: string[];
  missingConcepts: string[];
  narrative: string;
};

export type SessionRow = {
  id: string;
  mode: SessionMode;
  level: InterviewLevel;
  interview_type: InterviewType;
  status: SessionStatus;
  time_limit_seconds: number | null;
  started_at: string;
  ended_at: string | null;
  overall_score: number | null;
  verdict: SessionVerdict | null;
  ai_provider: string | null;
  ai_model: string | null;
  summary: SessionSummary | null;
  created_at: string;
  updated_at: string;
};

export type SessionQuestionRow = {
  id: string;
  session_id: string;
  question_id: string | null;
  parent_session_question_id: string | null;
  thread_position: number;
  follow_up_depth: number;
  prompt_text: string;
  asked_at: string;
};

export type AnswerRow = {
  id: string;
  session_question_id: string;
  answer_text: string;
  submitted_at: string;

  evaluated_at: string | null;
  overall_score: number | null;
  accuracy_score: number | null;
  depth_score: number | null;
  completeness_score: number | null;
  practicality_score: number | null;
  communication_score: number | null;
  seniority_score: number | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  missing_concepts: string[] | null;
  suggested_answer: string | null;
  interviewer_feedback: string | null;
  evaluation_error: string | null;

  ai_provider: string | null;
  ai_model: string | null;
  created_at: string;
};

export type SkillScoreEventRow = {
  id: string;
  answer_id: string;
  skill_axis: SkillAxis;
  score: number;
  level: InterviewLevel;
  occurred_at: string;
};

export type SkillSnapshotRow = {
  id: string;
  skill_axis: SkillAxis;
  rolling_average: number;
  sample_count: number;
  snapshot_at: string;
};

export type TrainingPlanRow = {
  id: string;
  generated_at: string;
  target_level: InterviewLevel | null;
  target_date: string | null;
  focus_skills: SkillAxis[];
  daily_tasks: { day: string; tasks: string[] }[];
  weekly_goal: string;
  readiness_estimate: {
    scoreNow: number;
    scoreTarget: number;
    projectedReadyDate: string | null;
  } | null;
  is_active: boolean;
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      questions: Table<QuestionRow>;
      sessions: Table<SessionRow>;
      session_questions: Table<SessionQuestionRow>;
      answers: Table<AnswerRow>;
      skill_score_events: Table<SkillScoreEventRow>;
      skill_snapshots: Table<SkillSnapshotRow>;
      training_plans: Table<TrainingPlanRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
