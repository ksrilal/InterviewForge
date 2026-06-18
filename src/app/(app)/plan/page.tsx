import { getActivePlan, getCompletedSessionCount } from "@/actions/plan.actions";
import { TrainingPlanCard } from "@/components/plan/training-plan-card";
import { RegeneratePlanButton } from "./regenerate-plan-button";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const [plan, completedCount] = await Promise.all([getActivePlan(), getCompletedSessionCount()]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <h1 className="text-xl font-semibold tracking-tight">Training Plan</h1>

      {!plan && completedCount < 3 && (
        <p className="text-sm text-muted-foreground">
          Complete at least 3 sessions before generating a plan (you have {completedCount}).
        </p>
      )}

      {plan && <TrainingPlanCard plan={plan} />}

      {completedCount >= 3 && <RegeneratePlanButton />}
    </div>
  );
}
