import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

// The app's wordmark: "Interview" in plain foreground, "Forge" in the
// brand violet (same --primary token used everywhere else) with a subtle
// gradient, matching the icon/marketing art style.
export function Logo({ className }: LogoProps) {
  return (
    <span className={cn("font-bold tracking-tight", className)}>
      <span className="text-foreground">Interview</span>
      <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
        Forge
      </span>
    </span>
  );
}
