import OpenAI from "openai";
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

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;
  readonly model: string;
  private client: OpenAI;
  private lastUsage: AIUsage | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set.");
    }
    this.model = process.env.OPENAI_MODEL ?? "gpt-4.1";
    this.client = new OpenAI({ apiKey });
  }

  getLastUsage(): AIUsage | null {
    return this.lastUsage;
  }

  private async call(system: string, user: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    this.lastUsage = {
      inputTokens: (this.lastUsage?.inputTokens ?? 0) + (response.usage?.prompt_tokens ?? 0),
      outputTokens: (this.lastUsage?.outputTokens ?? 0) + (response.usage?.completion_tokens ?? 0),
    };

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Unexpected empty OpenAI response.");
    }
    return content;
  }

  private async callAndValidate<T>(
    system: string,
    user: string,
    schema: import("zod").ZodSchema<T>
  ): Promise<T> {
    this.lastUsage = null;
    const firstAttempt = await this.call(system, user);
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
      const secondAttempt = await this.call(system, repairUser);
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
    return this.callAndValidate(system, user, TrainingPlanSchema);
  }

  async extractKnowledge(input: ExtractKnowledgeInput): Promise<KnowledgeExtractionResult> {
    const { system, user } = buildKnowledgeExtractionPrompt(input);
    const schema = input.isCustomDomain ? FreeformKnowledgeExtractionSchema : KnowledgeExtractionSchema;
    return this.callAndValidate(system, user, schema);
  }
}
