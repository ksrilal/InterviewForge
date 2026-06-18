import { PERSONA_PREAMBLE } from "./interviewer.prompt";
import type { InterviewLevel, InterviewType, QuestionType } from "@/types/domain";

export interface QuestionGenerationPromptInput {
  level: InterviewLevel;
  interviewType: InterviewType;
  questionType: QuestionType;
  topic?: string;
  recentPromptTitles: string[];
}

export function buildQuestionGenerationPrompt(input: QuestionGenerationPromptInput): {
  system: string;
  user: string;
} {
  const { level, interviewType, questionType, topic, recentPromptTitles } = input;

  const system = `${PERSONA_PREAMBLE}

Generate ONE new interview question matching the requested parameters exactly.`;

  const user = `level=${level}, interviewType=${interviewType}, questionType=${questionType}
topic area=${topic ?? "your choice within scope, prefer topics not already covered below"}

It must be answerable in 1-3 minutes of spoken explanation (no take-home-sized scope).
Avoid duplicating the spirit of these existing prompts:
${recentPromptTitles.map((t) => `- ${t}`).join("\n")}

Respond with a JSON object matching this exact shape (no markdown, no commentary outside the JSON):
{
  "category": string,
  "topic": string,
  "questionType": "${questionType}",
  "difficulty": number (1-5),
  "level": "${level}",
  "interviewTypes": string[] (must include "${interviewType}"),
  "skillAxes": string[] (one or more of: architecture, system_design, databases, security, backend, cloud, devops, leadership, communication),
  "prompt": string,
  "expectedAnswerAreas": string[],
  "commonMistakes": string[],
  "followUpSeeds": string[],
  "scoringRubric": { "accuracy": string, "depth": string, "completeness": string, "practicality": string, "communication": string, "seniority": string }
}`;

  return { system, user };
}
