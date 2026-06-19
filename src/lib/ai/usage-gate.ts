import { getSupabaseServerClient } from "@/lib/supabase/server";
import { estimateCostUsd } from "@/lib/billing/pricing";
import type { AIProvider } from "@/ai/provider";

export class AIQuotaExceededError extends Error {}

// Call before every AIProvider method invocation. Every user starts with a
// fixed free trial (profiles.ai_trial_limit, default 5); once
// ai_request_count reaches it, further calls are blocked until an admin
// flips ai_access_enabled on for that account.
export async function checkAIQuota(userId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_access_enabled, ai_request_count, ai_trial_limit, is_disabled")
    .eq("id", userId)
    .single();

  if (!profile) return;

  if (profile.is_disabled) {
    throw new AIQuotaExceededError("Your account has been disabled.");
  }

  if (!profile.ai_access_enabled && profile.ai_request_count >= profile.ai_trial_limit) {
    throw new AIQuotaExceededError(
      `You've used all ${profile.ai_trial_limit} free AI requests. Ask an admin to enable full access.`
    );
  }
}

// Call once immediately after a successful AIProvider call (exactly once per
// logical request - e.g. once per evaluateAnswer call even though it may
// retry across two providers, not once per underlying HTTP call). Records
// token usage/cost for the admin billing view and increments the trial
// counter via increment_ai_request_count() (see migration 0008) - that RPC
// is the only way ai_request_count changes from a user's own session.
export async function recordAIUsage(userId: string, provider: AIProvider): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await supabase.rpc("increment_ai_request_count");

  const usage = provider.getLastUsage();
  if (!usage) return;

  const estimatedCostUsd = estimateCostUsd(provider.model, usage.inputTokens, usage.outputTokens);
  await supabase.from("ai_usage_events").insert({
    user_id: userId,
    provider: provider.name,
    model: provider.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    estimated_cost_usd: estimatedCostUsd,
  });
}
