import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface RecentSession {
  id: string;
  level: string;
  interviewType: string;
  overallScore: number | null;
  verdict: "pass" | "borderline" | "fail" | null;
}

interface RecentSessionsListProps {
  sessions: RecentSession[];
  // interview_type is a placeholder value for custom domains (see
  // session.actions.ts#startSession) - not worth showing there.
  isCustomDomain: boolean;
}

const VERDICT_ICON: Record<string, string> = { pass: "✓", borderline: "⚠", fail: "✕" };

export function RecentSessionsList({ sessions, isCustomDomain }: RecentSessionsListProps) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No sessions yet. Start your first interview above.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link
            href={`/interview/${s.id}/summary`}
            className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-sm hover:bg-accent/40"
          >
            <span className="capitalize text-foreground">
              {s.level.replace("_", " ")}
              {!isCustomDomain ? ` · ${s.interviewType.replace("_", " ")}` : ""}
            </span>
            <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
              {s.overallScore != null ? Math.round(s.overallScore) : "—"}
              {s.verdict && <Badge variant="outline">{VERDICT_ICON[s.verdict]}</Badge>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
