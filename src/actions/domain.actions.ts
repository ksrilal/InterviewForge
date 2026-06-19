"use server";

import { createHash, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guard";
import { getAIProvider } from "@/ai/provider";
import { checkAIQuota, recordAIUsage } from "@/lib/ai/usage-gate";
import { extractText } from "@/lib/documents/extract-text";
import type { ActionResult } from "@/types/domain";
import type { DomainRow, KnowledgeSourceRow } from "@/lib/supabase/types";

type SupabaseClient = Awaited<ReturnType<typeof requireUser>>["supabase"];

export interface DomainSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isCustom: boolean;
}

export async function listDomains(search?: string): Promise<DomainSummary[]> {
  const { supabase } = await requireUser();

  let query = supabase.from("domains").select("*").order("name");
  if (search) {
    const term = search.trim().replace(/[,()%*]/g, "");
    if (term) query = query.ilike("name", `%${term}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as DomainRow[]).map((d) => ({
    id: d.id,
    slug: d.slug,
    name: d.name,
    description: d.description,
    isCustom: d.owner_user_id !== null,
  }));
}

export interface CreateDomainResult {
  domainId: string;
  questionsGenerated: number;
}

// Shared by domain creation and "add more questions to an existing domain":
// converts the pasted text/uploaded file to plain text once (so the AI call
// is sent text, never the raw file - keeps token usage proportional to
// content, not file size), records it as a knowledge_sources row, and has
// the AI generate a categorized question set for it. Generated questions
// inherit the target domain's existing ownership (private domain -> private
// questions; the global Software Engineering domain -> shared questions,
// same as the pre-existing "generate into the shared bank" behavior).
async function ingestKnowledgeSource(
  supabase: SupabaseClient,
  userId: string,
  domain: { id: string; name: string; description: string | null; owner_user_id: string | null },
  formData: FormData
): Promise<ActionResult<CreateDomainResult>> {
  const pastedText = (formData.get("text") as string | null)?.trim();
  const file = formData.get("file") as File | null;

  let sourceType: "manual" | "markdown" | "pdf";
  let rawText: string;
  let storagePath: string | null = null;
  let title = domain.name;

  if (file && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    sourceType = isPdf ? "pdf" : "markdown";
    rawText = await extractText(bytes, isPdf ? "application/pdf" : "text/markdown");
    title = file.name;

    storagePath = `${userId}/${randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("domain-uploads")
      .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream" });
    if (uploadError) {
      return { ok: false, error: `Failed to upload file: ${uploadError.message}` };
    }
  } else if (pastedText) {
    sourceType = "manual";
    rawText = pastedText;
  } else {
    return { ok: false, error: "Provide some text or upload a markdown/PDF file." };
  }

  if (!rawText) {
    return { ok: false, error: "No readable text found in the provided content." };
  }

  const contentHash = createHash("sha256").update(rawText).digest("hex");

  const { data: source, error: sourceError } = await supabase
    .from("knowledge_sources")
    .insert({
      domain_id: domain.id,
      source_type: sourceType,
      title,
      storage_path: storagePath,
      extracted_text: rawText,
      content_hash: contentHash,
      status: "processing",
    })
    .select("*")
    .single();
  if (sourceError || !source) {
    return { ok: false, error: sourceError?.message ?? "Failed to save source." };
  }
  const sourceRow = source as KnowledgeSourceRow;

  const provider = getAIProvider();
  let result;
  try {
    await checkAIQuota(userId);
    result = await provider.extractKnowledge({
      domainName: domain.name,
      domainDescription: domain.description ?? undefined,
      sourceText: rawText,
      isCustomDomain: domain.owner_user_id !== null,
    });
    await recordAIUsage(userId, provider);
  } catch (err) {
    await supabase
      .from("knowledge_sources")
      .update({ status: "failed", error: (err as Error).message })
      .eq("id", sourceRow.id);
    return { ok: false, error: `AI question generation failed: ${(err as Error).message}` };
  }

  let questionsGenerated = 0;
  let lastInsertError: string | null = null;
  for (const generated of result.questions) {
    const { data: inserted, error: insertError } = await supabase
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
        owner_user_id: domain.owner_user_id,
        domain_id: domain.id,
      })
      .select("id")
      .single();

    if (!insertError && inserted) {
      questionsGenerated += 1;
      await supabase
        .from("knowledge_source_questions")
        .insert({ source_id: sourceRow.id, question_id: (inserted as { id: string }).id });
    } else if (insertError) {
      lastInsertError = insertError.message;
    }
  }

  await supabase
    .from("knowledge_sources")
    .update({
      status: questionsGenerated > 0 ? "completed" : "failed",
      error: questionsGenerated > 0 ? null : lastInsertError ?? "No questions were generated.",
    })
    .eq("id", sourceRow.id);

  if (questionsGenerated === 0) {
    // Surface the real DB error (e.g. a stale enum constraint after a
    // pending migration hasn't been applied yet) instead of a generic
    // message that hides what actually went wrong.
    return {
      ok: false,
      error: lastInsertError
        ? `Failed to save generated questions: ${lastInsertError}`
        : "The AI didn't generate any usable questions from this content.",
    };
  }

  revalidatePath("/questions");
  revalidatePath(`/questions/domain/${domain.id}`);
  return { ok: true, data: { domainId: domain.id, questionsGenerated } };
}

export async function createDomainFromUpload(
  formData: FormData
): Promise<ActionResult<CreateDomainResult>> {
  const { supabase, user } = await requireUser();

  const name = (formData.get("name") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!name) {
    return { ok: false, error: "Domain name is required." };
  }

  const slugBase = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slugBase) {
    return { ok: false, error: "Domain name must contain at least one letter or number." };
  }

  // Domains are private per account, so the same name across two accounts
  // would otherwise collide on the global slug uniqueness constraint.
  const slug = `${slugBase}-${user.id.slice(0, 8)}`;

  const { data: domain, error: domainError } = await supabase
    .from("domains")
    .insert({ slug, name, description, owner_user_id: user.id })
    .select("*")
    .single();
  if (domainError || !domain) {
    return { ok: false, error: domainError?.message ?? "Failed to create domain." };
  }
  const domainRow = domain as DomainRow;

  const result = await ingestKnowledgeSource(supabase, user.id, domainRow, formData);
  if (!result.ok) {
    // Domain was created but generation failed - clean it up rather than
    // leaving an empty orphaned domain in the user's list.
    await supabase.from("domains").delete().eq("id", domainRow.id);
  }
  return result;
}

// Adds another knowledge source to a domain the user already has access to
// (their own private domain, or the global Software Engineering domain),
// generating more questions for it without creating a new domain. RLS on
// the `domains` select policy already scopes this to domains the caller can
// see, so fetching one they don't own/share simply returns nothing.
export async function addKnowledgeToDomain(
  domainId: string,
  formData: FormData
): Promise<ActionResult<CreateDomainResult>> {
  const { supabase, user } = await requireUser();

  const { data: domain, error: domainError } = await supabase
    .from("domains")
    .select("*")
    .eq("id", domainId)
    .single();
  if (domainError || !domain) {
    return { ok: false, error: "Domain not found." };
  }

  return ingestKnowledgeSource(supabase, user.id, domain as DomainRow, formData);
}

// RLS (owner_delete_domains) already prevents deleting domains this account
// doesn't own, including the global seed domain - no extra check needed here.
// questions.domain_id has no ON DELETE CASCADE, so its rows are deleted
// first (also owner-scoped by RLS, so this can't touch anyone else's data).
export async function deleteDomain(domainId: string): Promise<ActionResult<void>> {
  const { supabase } = await requireUser();
  await supabase.from("questions").delete().eq("domain_id", domainId);
  const { error } = await supabase.from("domains").delete().eq("id", domainId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/questions");
  return { ok: true };
}
