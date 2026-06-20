import { buildPersonaPreamble } from "./interviewer.prompt";
import type { CodeLanguage, CompanyType, InterviewerPersonality, Question } from "@/types/domain";

export interface CodeReviewPromptInput {
  question: Pick<Question, "prompt" | "difficulty" | "level" | "scoringRubric" | "commonMistakes">;
  code: string;
  language: CodeLanguage;
  personality?: InterviewerPersonality;
  companyType?: CompanyType | null;
}

// Coding Workspace feature: this is a STATIC, read-through review only -
// there is no compiler or runtime behind it. Every instruction below exists
// to stop the model from ever implying otherwise (no "this compiles", no
// "running this produces...", no fabricated output/stack traces).
export function buildCodeReviewPrompt(input: CodeReviewPromptInput): {
  system: string;
  user: string;
} {
  const { question, code, language, personality, companyType } = input;

  const system = `${buildPersonaPreamble(personality, companyType)}

You are reviewing a candidate's code submission for an interview question. You are performing a
STATIC, READ-THROUGH CODE REVIEW ONLY. You have no compiler, interpreter, linter, or runtime - you
cannot execute this code and must never claim or imply that you did. Do not say the code
"compiles", "runs", "passes", "throws", "outputs", or similar - you are reading the code as a
senior engineer would in a PR review, reasoning from what's written, not from execution.

If you are not certain whether something is a genuine issue (e.g. a missing import you can't
verify, or behavior that depends on a runtime/library version), say so as a caveat rather than
asserting it as fact.

Every finding you report must fit under exactly one of these three labels, which the UI will show
verbatim - write with that framing in mind:
- "AI Code Review" - the overall read and stylistic/structural observations.
- "Static Analysis" - syntax issues, likely bugs, performance concerns, security concerns.
- "Interview Evaluation" - how this would land in a real interview at the candidate's target level.`;

  const user = `Question: "${question.prompt}"
Difficulty: ${question.difficulty} | Target level: ${question.level} | Language: ${language}

Scoring rubric (verbatim, per-dimension):
${JSON.stringify(question.scoringRubric, null, 2)}

Common mistakes seen at this question:
${question.commonMistakes.map((m) => `- ${m}`).join("\n")}

Candidate's code submission (${language}):
\`\`\`${language}
${code}
\`\`\`

Respond with a JSON object matching this exact shape (no markdown, no commentary outside the JSON):
{
  "overallAssessment": string (2-3 sentences, the "AI Code Review" headline read),
  "syntaxIssues": string[] (best-effort - things that look like syntax/type errors on inspection; empty array if none spotted),
  "bugs": string[] (logic errors, edge cases unhandled, off-by-one, null/undefined handling, etc.),
  "performanceConcerns": string[] (complexity, unnecessary work, obvious inefficiencies),
  "securityConcerns": string[] (injection risk, unsafe input handling, secrets, etc. - empty array if not applicable to this question),
  "maintainabilityFeedback": string[] (naming, structure, readability, testability),
  "codeQualityNotes": string[] (idiomatic use of ${language}, style conventions),
  "suggestedImprovements": string[] (concrete, actionable changes),
  "exampleOptimizedSolution": string (a rewritten version showing what a strong ${question.level} answer looks like in ${language}),
  "interviewerFeedback": string (1-3 sentences, how this would actually land in the interview - the "Interview Evaluation" framing)
}

Frame every field as a static read-through observation, never as an execution result.`;

  return { system, user };
}
