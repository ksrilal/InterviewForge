import { z } from "zod";

export const EvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  dimensions: z.object({
    accuracy: z.number().min(0).max(100),
    depth: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
    practicality: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
    seniority: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  suggestedAnswer: z.string(),
  interviewerFeedback: z.string(),
});

export const FollowUpDecisionSchema = z.object({
  action: z.enum(["ASK_FOLLOW_UP", "NEW_TOPIC", "END_SESSION"]),
  followUpPrompt: z.string().optional(),
});

const InterviewLevelSchema = z.enum([
  "junior",
  "mid",
  "senior",
  "staff",
  "tech_lead",
]);

const InterviewTypeSchema = z.enum([
  "backend",
  "full_stack",
  "dotnet",
  "architecture",
  "system_design",
  "cloud",
  "devops",
  "behavioral",
  "ai",
]);

const QuestionTypeSchema = z.enum([
  "theory",
  "scenario",
  "debugging",
  "architecture",
  "system_design",
  "behavioral",
]);

const SkillAxisSchema = z.enum([
  "architecture",
  "system_design",
  "databases",
  "security",
  "backend",
  "cloud",
  "devops",
  "leadership",
  "communication",
  "ai",
]);

export const GeneratedQuestionSchema = z.object({
  category: z.string(),
  topic: z.string(),
  questionType: QuestionTypeSchema,
  difficulty: z.number().min(1).max(5),
  level: InterviewLevelSchema,
  interviewTypes: z.array(InterviewTypeSchema).min(1),
  skillAxes: z.array(SkillAxisSchema).min(1),
  prompt: z.string(),
  expectedAnswerAreas: z.array(z.string()),
  commonMistakes: z.array(z.string()),
  followUpSeeds: z.array(z.string()),
  scoringRubric: z.record(z.string(), z.string()),
});

export const KnowledgeExtractionSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(1),
});

// Used for knowledge extraction into a custom (non-Software-Engineering)
// domain - interviewTypes/skillAxes there can't be validated against the SE
// enums above since a domain like "Interior Designer" has none of those
// categories. interviewTypes isn't meaningfully used for custom domains
// (see question.actions.ts#pickQuestionInDomain) so it's just left optional;
// skillAxes is free text so the AI can invent domain-appropriate labels.
const FreeformGeneratedQuestionSchema = GeneratedQuestionSchema.extend({
  interviewTypes: z.array(z.string()).default([]),
  skillAxes: z.array(z.string()).min(1),
});

export const FreeformKnowledgeExtractionSchema = z.object({
  questions: z.array(FreeformGeneratedQuestionSchema).min(1),
});

export const TrainingPlanSchema = z.object({
  targetLevel: InterviewLevelSchema.nullable(),
  targetDate: z.string().nullable(),
  focusSkills: z.array(SkillAxisSchema),
  dailyTasks: z.array(
    z.object({
      day: z.string(),
      tasks: z.array(z.string()),
    })
  ),
  weeklyGoal: z.string(),
  readinessEstimate: z
    .object({
      scoreNow: z.number(),
      scoreTarget: z.number(),
      projectedReadyDate: z.string().nullable(),
    })
    .nullable(),
});
