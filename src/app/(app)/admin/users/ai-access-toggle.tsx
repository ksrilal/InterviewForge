"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setUserAIAccess } from "@/actions/admin.actions";

interface AIAccessToggleProps {
  userId: string;
  enabled: boolean;
}

export function AIAccessToggle({ userId, enabled }: AIAccessToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await setUserAIAccess(userId, !enabled);
      if (!result.ok) {
        setError(result.error ?? "Failed to update AI access.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant={enabled ? "outline" : "default"} size="sm" onClick={handleToggle} disabled={isPending}>
        {isPending ? "Saving..." : enabled ? "Revoke full access" : "Grant full access"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
