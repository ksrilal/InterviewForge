import { requireUser } from "@/lib/auth/guard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetDataButton } from "./reset-data-button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const accountLabel = user.email ?? user.user_metadata?.full_name ?? "—";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, ai_access_enabled, ai_request_count, ai_trial_limit")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  const aiProvider = process.env.ACTIVE_AI_PROVIDER ?? "—";
  const aiModel =
    aiProvider === "openai" ? process.env.OPENAI_MODEL : process.env.ANTHROPIC_MODEL;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-4xl mx-auto w-full">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Logged in as</span>
          <span className="text-foreground">{accountLabel}</span>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>AI Provider</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active provider</span>
              <span className="capitalize text-foreground">{aiProvider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model</span>
              <span className="text-foreground">{aiModel ?? "—"}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Configured via environment variables, not editable here.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>AI Access</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {profile?.ai_access_enabled ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge>Full access</Badge>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Free trial requests used</span>
              <span className="text-foreground tabular-nums">
                {Math.min(profile?.ai_request_count ?? 0, profile?.ai_trial_limit ?? 5)} /{" "}
                {profile?.ai_trial_limit ?? 5}
              </span>
            </div>
          )}
          {!profile?.ai_access_enabled &&
            (profile?.ai_request_count ?? 0) >= (profile?.ai_trial_limit ?? 5) && (
              <p className="text-xs text-destructive">
                You&apos;ve used all your free requests. Ask an admin to enable full access.
              </p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Permanently delete all sessions, answers, skill history, and training plans.
            The question bank is kept.
          </p>
          <ResetDataButton />
        </CardContent>
      </Card>
    </div>
  );
}
