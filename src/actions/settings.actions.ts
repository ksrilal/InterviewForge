"use server";

import { requireUser } from "@/lib/auth/guard";

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
