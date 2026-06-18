import { cn } from "@/lib/utils";

interface ScoreBarProps {
  label: string;
  score: number;
}

// Score bars use the semantic success/warning/destructive tokens, never the
// primary accent - keeps "this is a score" visually distinct from "this is
// a clickable action" (see docs/04-frontend-architecture.md Theming section).
function scoreColorClass(score: number): string {
  if (score >= 70) return "bg-success";
  if (score >= 40) return "bg-warning";
  return "bg-destructive";
}

export function ScoreBar({ label, score }: ScoreBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm text-muted-foreground capitalize">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", scoreColorClass(score))}
          style={{ width: `${Math.max(score, 2)}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">{Math.round(score)}</span>
    </div>
  );
}
