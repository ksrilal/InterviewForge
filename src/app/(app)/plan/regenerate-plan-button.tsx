"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generatePlan } from "@/actions/plan.actions";

export function RegeneratePlanButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generatePlan(null, null);
      if (!result.ok) {
        setError(result.error ?? "Failed to generate plan.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleClick} disabled={isPending} variant="outline" size="lg">
        {isPending ? "Generating..." : "Regenerate Plan"}
      </Button>
    </div>
  );
}
