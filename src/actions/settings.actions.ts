"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guard";
import type { ActionResult } from "@/types/domain";

export interface ResetDataResult {
  ok: boolean;
  error?: string;
}

// Wipes all user-generated data (sessions, answers, skill history, training
// plans) but keeps the seeded question bank intact. Sessions cascade-delete
// session_questions and answers via FK constraints in 0001_init.sql, so
// deleting sessions first clears most of the tree; skill_snapshots and
// training_plans have no FK back to sessions and need separate deletes.
export async function resetAllData(): Promise<ResetDataResult> {
  const { supabase } = await requireUser();

  const { error: sessionsError } = await supabase
    .from("sessions")
    .delete()
    .not("id", "is", null);
  if (sessionsError) {
    return { ok: false, error: sessionsError.message };
  }

  const { error: snapshotsError } = await supabase
    .from("skill_snapshots")
    .delete()
    .not("id", "is", null);
  if (snapshotsError) {
    return { ok: false, error: snapshotsError.message };
  }

  const { error: plansError } = await supabase
    .from("training_plans")
    .delete()
    .not("id", "is", null);
  if (plansError) {
    return { ok: false, error: plansError.message };
  }

  return { ok: true };
}

// Coding Workspace feature: lets a user state their preferred languages
// (from the editor's supported list) and frameworks/tools (free text, e.g.
// Angular, .NET, PostgreSQL), used to bias AI-generated coding questions
// toward their actual stack instead of a random pick.
export async function updatePreferredStack(
  languages: string[],
  frameworks: string[]
): Promise<ActionResult<void>> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_languages: languages, preferred_frameworks: frameworks })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}
