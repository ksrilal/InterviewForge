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

export type InterviewerPersonality =
  | "supportive_mentor"
  | "professional"
  | "strict_senior"
  | "tough_reviewer"
  | "faang_interviewer";

export type CompanyType = "startup" | "enterprise" | "product" | "faang" | "remote_first";

export type UserRole = "candidate" | "admin";

export type QuestionRow = {
  id: string;
  category: string;
  topic: string;
  question_type: QuestionType;
  difficulty: number;
  level: InterviewLevel;
  // string[], not InterviewType[] - the column is still the Postgres enum
  // array (Postgres itself rejects out-of-set values), but custom-domain
  // questions store this empty since the SE categorization doesn't apply.
  interview_types: string[];
  // Free text - SkillAxis's fixed union only applies to the global
  // Software Engineering domain. Custom domains get AI-invented labels
  // (e.g. "Space Planning") that aren't part of that closed set.
  skill_axes: string[];
  prompt: string;
  expected_answer_areas: string[];
  common_mistakes: string[];
  follow_up_seeds: string[];
  scoring_rubric: Record<string, string>;
  source: "seed" | "ai_generated" | "manual";
  // null = shared/global question (seed or AI-generated into the common
  // bank); set = privately owned by the user who generated/authored it.
  owner_user_id: string | null;
  domain_id: string;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  target_level: InterviewLevel | null;
  target_date: string | null;
  role: UserRole;
  // Free trial quota before AI access requires admin approval.
  ai_trial_limit: number;
  // Admin-granted full access - bypasses the trial limit once true.
  ai_access_enabled: boolean;
  // Lifetime count of AI requests made, only ever incremented via the
  // increment_ai_request_count() RPC (see migration 0008) - not directly
  // writable from a user's own session.
  ai_request_count: number;
  is_disabled: boolean;
  created_at: string;
};

export type AIUsageEventRow = {
  id: string;
  user_id: string;
  provider: "anthropic" | "openai";
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  created_at: string;
};

export type DomainRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
  // null = global/seed domain (e.g. "Software Engineering"); set = private
  // to the user who created it from their own uploaded content.
  owner_user_id: string | null;
};

export type KnowledgeSourceStatus = "pending" | "processing" | "completed" | "failed";

export type KnowledgeSourceRow = {
  id: string;
  user_id: string;
  domain_id: string;
  source_type: "manual" | "markdown" | "pdf";
  title: string;
  storage_path: string | null;
  extracted_text: string | null;
  content_hash: string | null;
  status: KnowledgeSourceStatus;
  error: string | null;
  created_at: string;
};

export type KnowledgeSourceQuestionRow = {
  source_id: string;
  question_id: string;
};

export type SessionSummary = {
  strengths: string[];
  weaknesses: string[];
  missingConcepts: string[];
  narrative: string;
};

export type SessionRow = {
  id: string;
  user_id: string;
  domain_id: string;
  mode: SessionMode;
  level: InterviewLevel;
  interview_type: InterviewType;
  status: SessionStatus;
  time_limit_seconds: number | null;
  interviewer_personality: InterviewerPersonality;
  company_type: CompanyType | null;
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
  user_id: string;
  domain_id: string;
  answer_id: string;
  skill_axis: string;
  score: number;
  level: InterviewLevel;
  occurred_at: string;
};

export type SkillSnapshotRow = {
  id: string;
  user_id: string;
  domain_id: string;
  skill_axis: string;
  rolling_average: number;
  sample_count: number;
  snapshot_at: string;
};

export type TrainingPlanRow = {
  id: string;
  user_id: string;
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
      profiles: Table<ProfileRow>;
      domains: Table<DomainRow>;
      knowledge_sources: Table<KnowledgeSourceRow>;
      knowledge_source_questions: Table<KnowledgeSourceQuestionRow>;
      ai_usage_events: Table<AIUsageEventRow>;
    };
    Views: Record<string, never>;
    Functions: {
      increment_ai_request_count: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
  };
};
