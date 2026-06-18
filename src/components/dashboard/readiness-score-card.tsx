import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReadinessScoreCardProps {
  score: number;
  level: string;
  status: "pass" | "borderline" | "fail" | "no-data";
}

function statusColorClass(status: ReadinessScoreCardProps["status"]): string {
  if (status === "pass") return "text-success";
  if (status === "borderline") return "text-warning";
  if (status === "fail") return "text-destructive";
  return "text-muted-foreground";
}

const STATUS_LABEL: Record<ReadinessScoreCardProps["status"], string> = {
  pass: "Pass",
  borderline: "Borderline",
  fail: "Fail",
  "no-data": "No data yet",
};

export function ReadinessScoreCard({ score, level, status }: ReadinessScoreCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 py-6">
        <span className={cn("text-5xl font-semibold tabular-nums", statusColorClass(status))}>
          {status === "no-data" ? "—" : Math.round(score)}
        </span>
        <p className="text-sm text-muted-foreground capitalize">
          {level.replace("_", " ")} &middot; {STATUS_LABEL[status]}
        </p>
      </CardContent>
    </Card>
  );
}
