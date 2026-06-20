import type {
  CodeLanguage,
  CodeReviewResult,
  CompanyType,
  Evaluation,
  FollowUpDecision,
  GeneratedQuestion,
  InterviewerPersonality,
  InterviewLevel,
  InterviewType,
  KnowledgeExtractionResult,
  QuestionType,
  SessionVerdict,
  TrainingPlan,
} from "@/types/domain";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { OpenAIProvider } from "./providers/openai.provider";

export interface EvaluateAnswerInput {
  question: {
    prompt: string;
    questionType: QuestionType;
    difficulty: number;
    level: InterviewLevel;
    scoringRubric: Record<string, string>;
    commonMistakes: string[];
  };
  answerText: string;
  personality?: InterviewerPersonality;
  companyType?: CompanyType | null;
}

export interface DecideFollowUpInput {
  level: InterviewLevel;
  interviewType: InterviewType;
  domainName?: string;
  rootQuestionPrompt: string;
  expectedAnswerAreas: string[];
  followUpSeeds: string[];
  answerText: string;
  evaluation: Evaluation;
  followUpCount: number;
  maxFollowUps: number;
  personality?: InterviewerPersonality;
  companyType?: CompanyType | null;
}

export interface GenerateQuestionInput {
  level: InterviewLevel;
  interviewType: InterviewType;
  questionType: QuestionType;
  // Required when questionType is "coding".
  language?: CodeLanguage;
  topic?: string;
  recentPromptTitles: string[];
  personality?: InterviewerPersonality;
  companyType?: CompanyType | null;
}

export interface GenerateTrainingPlanInput {
  // string, not SkillAxis - training plans are still SE-domain-only for now,
  // but the snapshots they're built from come from the now-generic
  // (string-typed) radar pipeline.
  skillSnapshots: { axis: string; rollingAverage: number; sampleCount: number }[];
  targetLevel: InterviewLevel | null;
  targetDate: string | null;
  recentVerdicts: SessionVerdict[];
}

export interface ExtractKnowledgeInput {
  domainName: string;
  domainDescription?: string;
  sourceText: string;
  isCustomDomain: boolean;
  // Coding Workspace feature - biases any generated "coding" questions
  // toward the user's stated stack (Settings > Coding Preferences) instead
  // of a random language pick. Empty if the user hasn't set any.
  preferredLanguages?: string[];
  preferredFrameworks?: string[];
}

export interface ReviewCodeInput {
  question: {
    prompt: string;
    difficulty: number;
    level: InterviewLevel;
    scoringRubric: Record<string, string>;
    commonMistakes: string[];
  };
  code: string;
  language: CodeLanguage;
  personality?: InterviewerPersonality;
  companyType?: CompanyType | null;
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AIProvider {
  readonly name: "anthropic" | "openai";
  readonly model: string;
  evaluateAnswer(input: EvaluateAnswerInput): Promise<Evaluation>;
  decideFollowUp(input: DecideFollowUpInput): Promise<FollowUpDecision>;
  generateQuestion(input: GenerateQuestionInput): Promise<GeneratedQuestion>;
  generateTrainingPlan(input: GenerateTrainingPlanInput): Promise<TrainingPlan>;
  extractKnowledge(input: ExtractKnowledgeInput): Promise<KnowledgeExtractionResult>;
  // Static code review only - see code-review.prompt.ts. Never claims
  // execution; kept as its own method/result type so a future real
  // execution engine (Judge0/Piston) can be added as a separate method
  // without reshaping this one.
  reviewCode(input: ReviewCodeInput): Promise<CodeReviewResult>;
  // Token usage from the most recently completed call on this instance
  // (summed across the repair-retry attempt if one happened). Read this
  // immediately after awaiting one of the methods above - getAIProvider()
  // returns a fresh instance per call site, so there's no cross-request
  // state to worry about.
  getLastUsage(): AIUsage | null;
}

export type ProviderName = "anthropic" | "openai";

export function getAIProvider(override?: ProviderName): AIProvider {
  const active = override ?? (process.env.ACTIVE_AI_PROVIDER as ProviderName | undefined);

  if (active === "openai") {
    return new OpenAIProvider();
  }

  return new AnthropicProvider();
}

// Returns the "other" provider, if it's configured (has an API key set) -
// used for the cross-provider fallback path on evaluation failure
// (see docs/08-user-flows.md Flow 8).
export function getFallbackAIProvider(): AIProvider | null {
  const active = (process.env.ACTIVE_AI_PROVIDER as ProviderName | undefined) ?? "anthropic";
  const fallbackName: ProviderName = active === "openai" ? "anthropic" : "openai";

  const hasKey =
    fallbackName === "openai" ? !!process.env.OPENAI_API_KEY : !!process.env.ANTHROPIC_API_KEY;

  if (!hasKey) return null;
  return getAIProvider(fallbackName);
}
