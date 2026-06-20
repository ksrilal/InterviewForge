import { buildPersonaPreamble } from "./interviewer.prompt";
import type {
  CodeLanguage,
  CompanyType,
  InterviewerPersonality,
  InterviewLevel,
  InterviewType,
  QuestionType,
} from "@/types/domain";

export interface QuestionGenerationPromptInput {
  level: InterviewLevel;
  interviewType: InterviewType;
  questionType: QuestionType;
  // Required when questionType is "coding" - which language the generated
  // exercise should be written for.
  language?: CodeLanguage;
  topic?: string;
  recentPromptTitles: string[];
  personality?: InterviewerPersonality;
  companyType?: CompanyType | null;
}

export function buildQuestionGenerationPrompt(input: QuestionGenerationPromptInput): {
  system: string;
  user: string;
} {
  const { level, interviewType, questionType, language, topic, recentPromptTitles, personality, companyType } = input;
  const isCoding = questionType === "coding";

  const system = `${buildPersonaPreamble(personality, companyType)}

Generate ONE new interview question matching the requested parameters exactly.${
    isCoding
      ? ` This is a CODING question - the prompt must describe a self-contained exercise answerable by writing code directly in ${language}, not a verbal explanation.`
      : ""
  }`;

  const user = `level=${level}, interviewType=${interviewType}, questionType=${questionType}${isCoding ? `, language=${language}` : ""}
topic area=${topic ?? "your choice within scope, prefer topics not already covered below"}

${isCoding ? `It must be solvable by writing a focused ${language} function/snippet in well under an hour - no take-home-project scope.` : "It must be answerable in 1-3 minutes of spoken explanation (no take-home-sized scope)."}
Avoid duplicating the spirit of these existing prompts:
${recentPromptTitles.map((t) => `- ${t}`).join("\n")}

Respond with a JSON object matching this exact shape (no markdown, no commentary outside the JSON):
{
  "category": string,
  "topic": string,
  "questionType": "${questionType}",
  "difficulty": number (1-5),
  "level": "${level}",
  "interviewTypes": string[] (ONLY from this exact closed list: backend, full_stack, dotnet, architecture, system_design, cloud, devops, behavioral, ai - must include "${interviewType}"; do not invent any other value such as "databases" even if it seems descriptive - use skillAxes for that instead),
  "skillAxes": string[] (one or more of: architecture, system_design, databases, security, backend, cloud, devops, leadership, communication),
  "prompt": string,
  "expectedAnswerAreas": string[],
  "commonMistakes": string[],
  "followUpSeeds": string[],
  "scoringRubric": { "accuracy": string, "depth": string, "completeness": string, "practicality": string, "communication": string, "seniority": string },
  "language": ${isCoding ? `"${language}"` : "null"}
}`;

  return { system, user };
}
