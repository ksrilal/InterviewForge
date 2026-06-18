import { PERSONA_PREAMBLE } from "./interviewer.prompt";
import type { InterviewLevel, SkillAxis, SessionVerdict } from "@/types/domain";

export interface TrainingPlanPromptInput {
  skillSnapshots: { axis: SkillAxis; rollingAverage: number; sampleCount: number }[];
  targetLevel: InterviewLevel | null;
  targetDate: string | null;
  recentVerdicts: SessionVerdict[];
}

export function buildTrainingPlanPrompt(input: TrainingPlanPromptInput): {
  system: string;
  user: string;
} {
  const { skillSnapshots, targetLevel, targetDate, recentVerdicts } = input;

  const system = `${PERSONA_PREAMBLE}

You are now acting as a prep coach, not an interviewer. Be honest, not motivational-poster vague.`;

  const user = `Skill snapshot (9 axes, rolling averages):
${JSON.stringify(skillSnapshots, null, 2)}

Target level: ${targetLevel ?? "not specified"}
Target interview date: ${targetDate ?? "none given"}
Recent session verdicts: ${JSON.stringify(recentVerdicts)}

Identify the 2-3 weakest axes RELATIVE to what a ${targetLevel ?? "Senior"} interview actually
weights (e.g. Staff weights Architecture/Leadership higher than Mid). Produce a 7-day daily task
list with CONCRETE tasks ("answer 3 questions on Caching"), not vague advice ("study caching"),
and one weekly goal. If a target date is given, estimate readiness trajectory honestly - do not
inflate confidence just to be encouraging.

Respond with a JSON object matching this exact shape (no markdown, no commentary outside the JSON):
{
  "targetLevel": string | null,
  "targetDate": string | null,
  "focusSkills": string[] (skill axis names, weakest first),
  "dailyTasks": [{ "day": string, "tasks": string[] }] (7 entries),
  "weeklyGoal": string,
  "readinessEstimate": { "scoreNow": number, "scoreTarget": number, "projectedReadyDate": string | null } | null
}`;

  return { system, user };
}
