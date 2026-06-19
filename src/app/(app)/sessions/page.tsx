import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { Badge } from "@/components/ui/badge";
import { getDomainLabels } from "@/lib/domain-label";
import type { SessionRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const VERDICT_ICON: Record<string, string> = { pass: "✓", borderline: "⚠", fail: "✕" };

export default async function SessionsPage() {
  const { supabase } = await requireUser();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  const sessionRows = (sessions ?? []) as SessionRow[];
  const domainLabels = await getDomainLabels(supabase, sessionRows.map((s) => s.domain_id));

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-4xl mx-auto w-full">
      <h1 className="text-xl font-semibold tracking-tight">Sessions</h1>

      {sessionRows.length === 0 && (
        <p className="text-sm text-muted-foreground">No sessions yet.</p>
      )}

      <ul className="flex flex-col gap-2">
        {sessionRows.map((s) => {
          const domain = domainLabels.get(s.domain_id);
          return (
          <li key={s.id}>
            <Link
              href={s.status === "completed" ? `/interview/${s.id}/summary` : `/interview/${s.id}`}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-sm hover:bg-accent/40"
            >
              <div className="flex flex-col">
                <span className="capitalize text-foreground">
                  {s.level.replace("_", " ")} &middot; {domain?.name ?? s.interview_type.replace("_", " ")}
                  {domain && !domain.isCustom ? ` · ${s.interview_type.replace("_", " ")}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.started_at).toLocaleDateString()} &middot;{" "}
                  {s.mode === "practice" ? "Practice" : s.mode.replace("mock_", "") + "m Mock"}
                </span>
              </div>
              <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
                {s.status !== "completed" ? (
                  <Badge variant="secondary">{s.status}</Badge>
                ) : (
                  <>
                    {s.overall_score != null ? Math.round(s.overall_score) : "—"}
                    {s.verdict && <Badge variant="outline">{VERDICT_ICON[s.verdict]}</Badge>}
                  </>
                )}
              </span>
            </Link>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
