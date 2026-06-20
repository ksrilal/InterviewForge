"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updatePreferredStack } from "@/actions/settings.actions";
import type { CodeLanguage } from "@/types/domain";

const LANGUAGE_OPTIONS: { value: CodeLanguage; label: string }[] = [
  { value: "csharp", label: "C#" },
  { value: "java", label: "Java" },
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "sql", label: "SQL / PostgreSQL" },
  { value: "go", label: "Go" },
  { value: "cpp", label: "C++" },
];

interface PreferredStackFormProps {
  initialLanguages: string[];
  initialFrameworks: string[];
}

export function PreferredStackForm({ initialLanguages, initialFrameworks }: PreferredStackFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [languages, setLanguages] = useState<string[]>(initialLanguages);
  const [frameworksText, setFrameworksText] = useState(initialFrameworks.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleLanguage(value: CodeLanguage) {
    setSaved(false);
    setLanguages((prev) => (prev.includes(value) ? prev.filter((l) => l !== value) : [...prev, value]));
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    const frameworks = frameworksText
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await updatePreferredStack(languages, frameworks);
      if (!result.ok) {
        setError(result.error ?? "Failed to save preferences.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Preferred languages</Label>
        <p className="text-xs text-muted-foreground">
          Coding questions generated for you will favor these languages.
        </p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => {
            const isSelected = languages.includes(lang.value);
            return (
              <button
                key={lang.value}
                type="button"
                onClick={() => toggleLanguage(lang.value)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="frameworks" className="text-sm font-medium">
          Frameworks &amp; tools
        </Label>
        <p className="text-xs text-muted-foreground">
          Comma-separated (e.g. Angular, .NET, PostgreSQL) - used as context, not a strict filter.
        </p>
        <Input
          id="frameworks"
          value={frameworksText}
          onChange={(e) => {
            setSaved(false);
            setFrameworksText(e.target.value);
          }}
          placeholder="Angular, .NET, PostgreSQL"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && !isPending && <p className="text-sm text-success">Saved.</p>}

      <Button onClick={handleSave} disabled={isPending} className="w-fit">
        {isPending ? "Saving..." : "Save preferences"}
      </Button>
    </div>
  );
}
