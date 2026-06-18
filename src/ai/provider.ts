import type {
  Evaluation,
  FollowUpDecision,
  GeneratedQuestion,
  InterviewLevel,
  InterviewType,
  QuestionType,
  SessionVerdict,
  SkillAxis,
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
}

export interface DecideFollowUpInput {
  level: InterviewLevel;
  interviewType: InterviewType;
  rootQuestionPrompt: string;
  expectedAnswerAreas: string[];
  followUpSeeds: string[];
  answerText: string;
  evaluation: Evaluation;
  followUpCount: number;
  maxFollowUps: number;
}

export interface GenerateQuestionInput {
  level: InterviewLevel;
  interviewType: InterviewType;
  questionType: QuestionType;
  topic?: string;
  recentPromptTitles: string[];
}

export interface GenerateTrainingPlanInput {
  skillSnapshots: { axis: SkillAxis; rollingAverage: number; sampleCount: number }[];
  targetLevel: InterviewLevel | null;
  targetDate: string | null;
  recentVerdicts: SessionVerdict[];
}

export interface AIProvider {
  readonly name: "anthropic" | "openai";
  readonly model: string;
  evaluateAnswer(input: EvaluateAnswerInput): Promise<Evaluation>;
  decideFollowUp(input: DecideFollowUpInput): Promise<FollowUpDecision>;
  generateQuestion(input: GenerateQuestionInput): Promise<GeneratedQuestion>;
  generateTrainingPlan(input: GenerateTrainingPlanInput): Promise<TrainingPlan>;
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
