import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { Badge } from "@/components/ui/badge";
import { getDomainLabels } from "@/lib/domain-label";
import { listDomains } from "@/actions/domain.actions";
import { SessionFiltersBar } from "./session-filters";
import { DeleteSessionButton } from "./delete-session-button";
import type { SessionRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const VERDICT_ICON: Record<string, string> = { pass: "✓", borderline: "⚠", fail: "✕" };

interface PageProps {
  searchParams: Promise<{ domain?: string; search?: string }>;
}

export default async function SessionsPage({ searchParams }: PageProps) {
  const { domain, search } = await searchParams;
  const { supabase } = await requireUser();
  const allDomains = await listDomains();

  // Sessions have no free-text field of their own (level/type/mode are
  // enums) - "search" really means "find sessions in domains whose name
  // matches", so resolve matching domain ids first via listDomains' own
  // ilike search, then filter sessions by domain_id.
  let searchMatchedNoDomains = false;
  let searchDomainIds: string[] = [];
  if (search) {
    searchDomainIds = (await listDomains(search)).map((d) => d.id);
    searchMatchedNoDomains = searchDomainIds.length === 0;
  }

  let sessionRows: SessionRow[] = [];
  if (!searchMatchedNoDomains) {
    let query = supabase
      .from("sessions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);

    if (domain) {
      query = query.eq("domain_id", domain);
    } else if (search) {
      query = query.in("domain_id", searchDomainIds);
    }

    const { data: sessions } = await query;
    sessionRows = (sessions ?? []) as SessionRow[];
  }

  const domainLabels = await getDomainLabels(supabase, sessionRows.map((s) => s.domain_id));
  const hasActiveFilters = !!(domain || search);

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-4xl mx-auto w-full">
      <h1 className="text-xl font-semibold tracking-tight">Sessions</h1>

      <SessionFiltersBar domains={allDomains} />

      {sessionRows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters ? "No sessions match these filters." : "No sessions yet."}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {sessionRows.map((s) => {
          const sessionDomain = domainLabels.get(s.domain_id);
          return (
          <li key={s.id} className="flex items-center gap-1 rounded-md border border-border hover:bg-accent/40">
            <Link
              href={s.status === "completed" ? `/interview/${s.id}/summary` : `/interview/${s.id}`}
              className="flex flex-1 items-center justify-between px-3 py-2.5 text-sm"
            >
              <div className="flex flex-col">
                <span className="capitalize text-foreground">
                  {s.level.replace("_", " ")} &middot; {sessionDomain?.name ?? s.interview_type.replace("_", " ")}
                  {sessionDomain && !sessionDomain.isCustom ? ` · ${s.interview_type.replace("_", " ")}` : ""}
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
            <DeleteSessionButton sessionId={s.id} />
          </li>
          );
        })}
      </ul>
    </div>
  );
}
