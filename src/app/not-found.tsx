import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">Not found.</p>
      <Button nativeButton={false} render={<Link href="/dashboard" />}>Back to Dashboard</Button>
    </div>
  );
}
