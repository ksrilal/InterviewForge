"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground max-w-sm">
        {error.message || "Something went wrong loading this page."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
