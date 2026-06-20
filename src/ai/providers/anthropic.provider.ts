import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  AIUsage,
  DecideFollowUpInput,
  EvaluateAnswerInput,
  ExtractKnowledgeInput,
  GenerateQuestionInput,
  GenerateTrainingPlanInput,
} from "../provider";
import { buildEvaluationPrompt } from "../prompts/evaluation.prompt";
import { buildFollowUpPrompt } from "../prompts/followup.prompt";
import { buildQuestionGenerationPrompt } from "../prompts/question-generation.prompt";
import { buildTrainingPlanPrompt } from "../prompts/training-plan.prompt";
import { buildKnowledgeExtractionPrompt } from "../prompts/knowledge-extraction.prompt";
import {
  EvaluationSchema,
  FollowUpDecisionSchema,
  GeneratedQuestionSchema,
  KnowledgeExtractionSchema,
  FreeformKnowledgeExtractionSchema,
  TrainingPlanSchema,
} from "../schemas/ai-response.schemas";
import { AIResponseValidationError, parseAndValidate } from "../parse-json-response";
import type {
  Evaluation,
  FollowUpDecision,
  GeneratedQuestion,
  KnowledgeExtractionResult,
  TrainingPlan,
} from "@/types/domain";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;
  readonly model: string;
  private client: Anthropic;
  private lastUsage: AIUsage | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set.");
    }
    this.model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
    this.client = new Anthropic({ apiKey });
  }

  getLastUsage(): AIUsage | null {
    return this.lastUsage;
  }

  private async call(system: string, user: string, maxTokens = 2048): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });

    this.lastUsage = {
      inputTokens: (this.lastUsage?.inputTokens ?? 0) + (response.usage?.input_tokens ?? 0),
      outputTokens: (this.lastUsage?.outputTokens ?? 0) + (response.usage?.output_tokens ?? 0),
    };

    const block = response.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected Anthropic response content type.");
    }
    return block.text;
  }

  private async callAndValidate<T>(
    system: string,
    user: string,
    schema: import("zod").ZodSchema<T>,
    maxTokens = 2048
  ): Promise<T> {
    this.lastUsage = null;
    const firstAttempt = await this.call(system, user, maxTokens);
    try {
      return parseAndValidate(firstAttempt, schema);
    } catch (err) {
      if (!(err instanceof AIResponseValidationError)) throw err;

      const repairUser = `Your previous response didn't match the required schema. Here it was:
"""
${err.raw}
"""
Error: ${err.message}

Respond again with ONLY the corrected JSON object, no markdown, no commentary.`;
      const secondAttempt = await this.call(system, repairUser, maxTokens);
      return parseAndValidate(secondAttempt, schema);
    }
  }

  async evaluateAnswer(input: EvaluateAnswerInput): Promise<Evaluation> {
    const { system, user } = buildEvaluationPrompt(input);
    return this.callAndValidate(system, user, EvaluationSchema);
  }

  async decideFollowUp(input: DecideFollowUpInput): Promise<FollowUpDecision> {
    const { system, user } = buildFollowUpPrompt(input);
    return this.callAndValidate(system, user, FollowUpDecisionSchema);
  }

  async generateQuestion(input: GenerateQuestionInput): Promise<GeneratedQuestion> {
    const { system, user } = buildQuestionGenerationPrompt(input);
    return this.callAndValidate(system, user, GeneratedQuestionSchema);
  }

  async generateTrainingPlan(input: GenerateTrainingPlanInput): Promise<TrainingPlan> {
    const { system, user } = buildTrainingPlanPrompt(input);
    return this.callAndValidate(system, user, TrainingPlanSchema, 4096);
  }

  // Asks for 6-10 full question objects in one response - the 2048-token
  // default (sized for single-question/evaluation responses) truncates this
  // mid-JSON, which surfaces as "Response was not valid JSON" since the
  // output is cut off rather than malformed.
  async extractKnowledge(input: ExtractKnowledgeInput): Promise<KnowledgeExtractionResult> {
    const { system, user } = buildKnowledgeExtractionPrompt(input);
    const schema = input.isCustomDomain ? FreeformKnowledgeExtractionSchema : KnowledgeExtractionSchema;
    return this.callAndValidate(system, user, schema, 8192);
  }
}
