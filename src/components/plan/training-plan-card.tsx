import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TrainingPlanRow } from "@/lib/supabase/types";

const AXIS_LABELS: Record<string, string> = {
  architecture: "Architecture",
  system_design: "System Design",
  databases: "Databases",
  security: "Security",
  backend: "Backend",
  cloud: "Cloud",
  devops: "DevOps",
  leadership: "Leadership",
  communication: "Communication",
};

interface TrainingPlanCardProps {
  plan: TrainingPlanRow;
}

export function TrainingPlanCard({ plan }: TrainingPlanCardProps) {
  const today = plan.daily_tasks[0];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          {(plan.target_level || plan.target_date) && (
            <p className="text-sm text-muted-foreground capitalize">
              Target: {plan.target_level?.replace("_", " ") ?? "—"}
              {plan.target_date ? ` · by ${new Date(plan.target_date).toLocaleDateString()}` : ""}
            </p>
          )}
          {plan.readiness_estimate && (
            <p className="text-sm">
              Readiness:{" "}
              <span className="font-medium tabular-nums">{Math.round(plan.readiness_estimate.scoreNow)}</span>
              {" → need "}
              <span className="font-medium tabular-nums">{Math.round(plan.readiness_estimate.scoreTarget)}</span>
            </p>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Focus Areas</p>
            <div className="flex flex-wrap gap-2">
              {plan.focus_skills.map((axis) => (
                <Badge key={axis} variant="secondary">
                  {AXIS_LABELS[axis] ?? axis}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">This Week&apos;s Goal</p>
            <p className="text-sm text-foreground">{plan.weekly_goal}</p>
          </div>
        </CardContent>
      </Card>

      {today && (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Today ({today.day})</p>
            <ul className="flex flex-col gap-1.5">
              {today.tasks.map((task, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 size-4 shrink-0 rounded border border-border" />
                  {task}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
