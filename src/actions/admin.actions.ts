"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types/domain";
import type { ProfileRow, AIUsageEventRow } from "@/lib/supabase/types";

export interface AdminUserSummary {
  id: string;
  email: string | null;
  displayName: string | null;
  role: ProfileRow["role"];
  isDisabled: boolean;
  aiAccessEnabled: boolean;
  aiTrialLimit: number;
  aiRequestCount: number;
  monthCostUsd: number;
  totalCostUsd: number;
}

// Admin-only: every account plus its trial/usage/billing state for the
// Users page. Reads through the normal RLS-aware client (the
// admin_select_profiles / admin_select_ai_usage_events policies from
// migration 0008 let an admin's own session see every row) - no service
// role needed just to list.
export async function listUsersWithUsage(): Promise<AdminUserSummary[]> {
  const { supabase } = await requireAdmin();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !profiles) return [];

  const { data: usageEvents } = await supabase
    .from("ai_usage_events")
    .select("user_id, estimated_cost_usd, created_at");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const totalByUser = new Map<string, number>();
  const monthByUser = new Map<string, number>();
  for (const e of (usageEvents ?? []) as Pick<
    AIUsageEventRow,
    "user_id" | "estimated_cost_usd" | "created_at"
  >[]) {
    totalByUser.set(e.user_id, (totalByUser.get(e.user_id) ?? 0) + e.estimated_cost_usd);
    if (new Date(e.created_at) >= startOfMonth) {
      monthByUser.set(e.user_id, (monthByUser.get(e.user_id) ?? 0) + e.estimated_cost_usd);
    }
  }

  return (profiles as ProfileRow[]).map((p) => ({
    id: p.id,
    email: p.email,
    displayName: p.display_name,
    role: p.role,
    isDisabled: p.is_disabled,
    aiAccessEnabled: p.ai_access_enabled,
    aiTrialLimit: p.ai_trial_limit,
    aiRequestCount: p.ai_request_count,
    monthCostUsd: Math.round((monthByUser.get(p.id) ?? 0) * 10000) / 10000,
    totalCostUsd: Math.round((totalByUser.get(p.id) ?? 0) * 10000) / 10000,
  }));
}

// ai_access_enabled/role/is_disabled are not writable by a user's own
// session (see migration 0008's column revoke) - admin writes go through
// the service-role client instead, which bypasses that entirely.
export async function setUserAIAccess(userId: string, enabled: boolean): Promise<ActionResult<void>> {
  await requireAdmin();
  const admin = getSupabaseAdminClient();

  const { error } = await admin.from("profiles").update({ ai_access_enabled: enabled }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}

// Disables both at once: the real Supabase Auth ban (so the account can't
// authenticate at all, even with a still-valid token mid-session, once it
// next needs to refresh) and the local profiles.is_disabled flag (so
// (app)/layout.tsx can immediately sign out and bounce an already-valid
// session within its remaining token lifetime).
export async function setUserDisabled(userId: string, disabled: boolean): Promise<ActionResult<void>> {
  const { user } = await requireAdmin();
  if (user.id === userId) {
    return { ok: false, error: "You can't disable your own account." };
  }

  const admin = getSupabaseAdminClient();

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: disabled ? "876000h" : "none",
  });
  if (banError) return { ok: false, error: banError.message };

  const { error } = await admin.from("profiles").update({ is_disabled: disabled }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}
