"use server";

import { mapQuestionRow } from "@/lib/mappers";
import { getAIProvider } from "@/ai/provider";
import { checkAIQuota, recordAIUsage } from "@/lib/ai/usage-gate";
import type { InterviewLevel, InterviewType, Question } from "@/types/domain";
import type { QuestionRow } from "@/lib/supabase/types";
import { requireUser } from "@/lib/auth/guard";

// Picks a root question for a new topic in a session, matching domain +
// level + type, excluding any question already asked in this session (no
// repeats). Domain-scoped so a session never pulls in another domain's
// questions just because level/type happen to coincide.
export async function pickRootQuestion(
  domainId: string,
  level: InterviewLevel,
  interviewType: InterviewType,
  excludeQuestionIds: string[]
): Promise<Question | null> {
  const { supabase } = await requireUser();

  let query = supabase
    .from("questions")
    .select("*")
    .eq("domain_id", domainId)
    .eq("level", level)
    .contains("interview_types", [interviewType]);

  if (excludeQuestionIds.length > 0) {
    query = query.not("id", "in", `(${excludeQuestionIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * data.length);
  return mapQuestionRow(data[randomIndex] as QuestionRow);
}

// Picks a question for the mock-mode mix templates, allowing override of
// interview_type filter by question_type category instead (used by mock modes
// which mix technical/architecture/system_design/behavioral regardless of the
// single interview_type selected at setup). question_type is a question
// style (theory/scenario/...), not an SE-specific category, so this is
// already domain-agnostic beyond the domain_id scoping itself.
export async function pickQuestionByTypeMix(
  domainId: string,
  level: InterviewLevel,
  questionTypes: Question["questionType"][],
  excludeQuestionIds: string[]
): Promise<Question | null> {
  const { supabase } = await requireUser();

  let query = supabase
    .from("questions")
    .select("*")
    .eq("domain_id", domainId)
    .eq("level", level)
    .in("question_type", questionTypes);

  if (excludeQuestionIds.length > 0) {
    query = query.not("id", "in", `(${excludeQuestionIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * data.length);
  return mapQuestionRow(data[randomIndex] as QuestionRow);
}

// Picks any question in a domain at the given level, ignoring interview_type
// entirely - used for user-created domains, where the fixed interview_type
// categories (backend/dotnet/...) don't meaningfully describe the content
// (questions there are generated from whatever the user uploaded).
export async function pickQuestionInDomain(
  domainId: string,
  level: InterviewLevel,
  excludeQuestionIds: string[]
): Promise<Question | null> {
  const { supabase } = await requireUser();

  let query = supabase.from("questions").select("*").eq("domain_id", domainId).eq("level", level);

  if (excludeQuestionIds.length > 0) {
    query = query.not("id", "in", `(${excludeQuestionIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * data.length);
  return mapQuestionRow(data[randomIndex] as QuestionRow);
}

export async function getQuestionById(id: string): Promise<Question | null> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("questions").select("*").eq("id", id).single();
  if (error || !data) return null;
  return mapQuestionRow(data as QuestionRow);
}

export interface QuestionFilters {
  level?: InterviewLevel;
  interviewType?: InterviewType;
  category?: string;
  difficulty?: number;
  search?: string;
  domainId?: string;
}

export async function listQuestions(filters: QuestionFilters): Promise<Question[]> {
  const { supabase } = await requireUser();

  let query = supabase.from("questions").select("*").order("created_at", { ascending: false });

  if (filters.level) query = query.eq("level", filters.level);
  if (filters.interviewType) query = query.contains("interview_types", [filters.interviewType]);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
  if (filters.domainId) query = query.eq("domain_id", filters.domainId);
  if (filters.search) {
    // Postgrest's `.or()` parses the filter string itself, so commas and
    // parens in the search term would break or hijack the filter syntax.
    const term = filters.search.trim().replace(/[,()%*]/g, "");
    if (term) query = query.or(`prompt.ilike.%${term}%,topic.ilike.%${term}%`);
  }

  const { data, error } = await query.limit(100);
  if (error || !data) return [];
  return data.map((row) => mapQuestionRow(row as QuestionRow));
}

// Generates a new question via AI and persists it to the bank, growing it
// from usage (docs/06-ai-prompt-architecture.md Module 2). A lightweight
// duplicate-check compares against recent prompt titles in the same category.
export async function generateAndSaveQuestion(
  level: InterviewLevel,
  interviewType: InterviewType,
  questionType: Question["questionType"],
  topic?: string
): Promise<Question | null> {
  const { supabase, user } = await requireUser();

  try {
    await checkAIQuota(user.id);
  } catch {
    return null;
  }

  const { data: recent } = await supabase
    .from("questions")
    .select("prompt")
    .eq("level", level)
    .contains("interview_types", [interviewType])
    .limit(20);

  const recentPromptTitles = (recent ?? []).map((r) => (r as { prompt: string }).prompt.slice(0, 80));

  const provider = getAIProvider();
  const generated = await provider.generateQuestion({
    level,
    interviewType,
    questionType,
    topic,
    recentPromptTitles,
  });
  await recordAIUsage(user.id, provider);

  const { data: inserted, error } = await supabase
    .from("questions")
    .insert({
      category: generated.category,
      topic: generated.topic,
      question_type: generated.questionType,
      difficulty: generated.difficulty,
      level: generated.level,
      interview_types: generated.interviewTypes,
      skill_axes: generated.skillAxes,
      prompt: generated.prompt,
      expected_answer_areas: generated.expectedAnswerAreas,
      common_mistakes: generated.commonMistakes,
      follow_up_seeds: generated.followUpSeeds,
      scoring_rubric: generated.scoringRubric,
      source: "ai_generated",
    })
    .select("*")
    .single();

  if (error || !inserted) return null;
  return mapQuestionRow(inserted as QuestionRow);
}

export async function listCategories(domainId?: string): Promise<string[]> {
  const { supabase } = await requireUser();
  let query = supabase.from("questions").select("category");
  if (domainId) query = query.eq("domain_id", domainId);
  const { data, error } = await query;
  if (error || !data) return [];
  const unique = new Set(data.map((r) => (r as { category: string }).category));
  return Array.from(unique).sort();
}

const LEVEL_ORDER: InterviewLevel[] = ["junior", "mid", "senior", "staff", "tech_lead"];

// Mirrors listCategories: only the levels a domain's questions actually use
// show up as filter options, instead of always offering all 5 regardless of
// whether e.g. a custom domain ever got Staff/Tech Lead questions generated.
export async function listLevels(domainId?: string): Promise<InterviewLevel[]> {
  const { supabase } = await requireUser();
  let query = supabase.from("questions").select("level");
  if (domainId) query = query.eq("domain_id", domainId);
  const { data, error } = await query;
  if (error || !data) return [];
  const present = new Set(data.map((r) => (r as { level: InterviewLevel }).level));
  return LEVEL_ORDER.filter((l) => present.has(l));
}
