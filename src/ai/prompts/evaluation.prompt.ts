import { buildPersonaPreamble, SCORE_BAND_GUIDANCE } from "./interviewer.prompt";
import type { CompanyType, InterviewerPersonality, Question } from "@/types/domain";

export interface EvaluationPromptInput {
  question: Pick<
    Question,
    "prompt" | "questionType" | "difficulty" | "level" | "scoringRubric" | "commonMistakes"
  >;
  answerText: string;
  personality?: InterviewerPersonality;
  companyType?: CompanyType | null;
}

export function buildEvaluationPrompt(input: EvaluationPromptInput): {
  system: string;
  user: string;
} {
  const { question, answerText, personality, companyType } = input;

  const system = `${buildPersonaPreamble(personality, companyType)}

You are scoring a candidate's interview answer. Be exacting - most real interviewers overrate
politely; you must not. Use the rubric and score bands below verbatim, do not invent your own
criteria.

${SCORE_BAND_GUIDANCE}`;

  const user = `Question: "${question.prompt}"
Question type: ${question.questionType} | Difficulty: ${question.difficulty} | Target level: ${question.level}

Scoring rubric (verbatim, per-dimension):
${JSON.stringify(question.scoringRubric, null, 2)}

Common mistakes seen at this question:
${question.commonMistakes.map((m) => `- ${m}`).join("\n")}

Candidate's answer:
"""
${answerText}
"""

Respond with a JSON object matching this exact shape (no markdown, no commentary outside the JSON):
{
  "overallScore": number (0-100),
  "dimensions": {
    "accuracy": number, "depth": number, "completeness": number,
    "practicality": number, "communication": number, "seniority": number
  },
  "strengths": string[],
  "weaknesses": string[],
  "missingConcepts": string[],
  "suggestedAnswer": string,
  "interviewerFeedback": string
}

"suggestedAnswer" should model what a strong ${question.level} answer looks like, not a generic
textbook definition. "interviewerFeedback" should read like something an interviewer would actually
say to the candidate, in 1-3 sentences.`;

  return { system, user };
}
