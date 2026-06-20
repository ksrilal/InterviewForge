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
  // Defensive: a few early evaluations were saved when the AI prompt didn't
  // specify the dimension scale and the model defaulted to 0-10 instead of
  // 0-100 (fixed in evaluation.prompt.ts). Treat anything <= 10 as that
  // legacy scale so old saved evaluations still render a sensible bar.
  const normalizedScore = score > 0 && score <= 10 ? score * 10 : score;

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm text-muted-foreground capitalize">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", scoreColorClass(normalizedScore))}
          style={{ width: `${Math.max(normalizedScore, 2)}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">
        {Math.round(normalizedScore)}
      </span>
    </div>
  );
}
