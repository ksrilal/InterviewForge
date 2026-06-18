import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth/guard";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetDataButton } from "./reset-data-button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAuth();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const username = token?.split(".")[0] ?? "—";

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
          <span className="text-foreground">{username}</span>
        </CardContent>
      </Card>

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
