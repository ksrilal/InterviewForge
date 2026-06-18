import { PERSONA_PREAMBLE } from "./interviewer.prompt";
import type { Evaluation, InterviewLevel, InterviewType } from "@/types/domain";

export interface FollowUpPromptInput {
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

export function buildFollowUpPrompt(input: FollowUpPromptInput): {
  system: string;
  user: string;
} {
  const {
    level,
    interviewType,
    rootQuestionPrompt,
    expectedAnswerAreas,
    followUpSeeds,
    answerText,
    evaluation,
    followUpCount,
    maxFollowUps,
  } = input;

  const system = `${PERSONA_PREAMBLE}

You are interviewing a candidate for a ${level} ${interviewType} role. You must decide what
happens next in this line of questioning.`;

  const user = `Original question: "${rootQuestionPrompt}"
Expected answer areas: ${JSON.stringify(expectedAnswerAreas)}
Candidate's answer: "${answerText}"
Evaluation just produced: overall=${evaluation.overallScore}, gaps=${JSON.stringify(evaluation.missingConcepts)}
Follow-ups already asked this thread: ${followUpCount} / ${maxFollowUps} max
Follow-up seeds available: ${JSON.stringify(followUpSeeds)}

Decide ONE of: ASK_FOLLOW_UP | NEW_TOPIC | END_SESSION
If ASK_FOLLOW_UP: escalate depth using a definition -> reasoning -> applied -> edge-case
progression relative to what's already been asked. Low scores should generally probe the same
gap; high scores should generally go deeper or pivot to a related but harder angle.
You may NOT choose ASK_FOLLOW_UP if follow-ups already asked >= max allowed - choose NEW_TOPIC instead.

Respond with a JSON object matching this exact shape (no markdown, no commentary outside the JSON):
{
  "action": "ASK_FOLLOW_UP" | "NEW_TOPIC" | "END_SESSION",
  "followUpPrompt": string (required only if action is ASK_FOLLOW_UP)
}`;

  return { system, user };
}
