import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  DecideFollowUpInput,
  EvaluateAnswerInput,
  GenerateQuestionInput,
  GenerateTrainingPlanInput,
} from "../provider";
import { buildEvaluationPrompt } from "../prompts/evaluation.prompt";
import { buildFollowUpPrompt } from "../prompts/followup.prompt";
import { buildQuestionGenerationPrompt } from "../prompts/question-generation.prompt";
import { buildTrainingPlanPrompt } from "../prompts/training-plan.prompt";
import {
  EvaluationSchema,
  FollowUpDecisionSchema,
  GeneratedQuestionSchema,
  TrainingPlanSchema,
} from "../schemas/ai-response.schemas";
import { AIResponseValidationError, parseAndValidate } from "../parse-json-response";
import type { Evaluation, FollowUpDecision, GeneratedQuestion, TrainingPlan } from "@/types/domain";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;
  readonly model: string;
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set.");
    }
    this.model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
    this.client = new Anthropic({ apiKey });
  }

  private async call(system: string, user: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: user }],
    });

    const block = response.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected Anthropic response content type.");
    }
    return block.text;
  }

  private async callAndValidate<T>(
    system: string,
    user: string,
    schema: import("zod").ZodSchema<T>
  ): Promise<T> {
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
}
