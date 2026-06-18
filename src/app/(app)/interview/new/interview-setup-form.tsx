"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startSession } from "@/actions/session.actions";
import { useInterviewSessionStore } from "@/store/interview-session.store";

const LEVELS = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff" },
  { value: "tech_lead", label: "Tech Lead" },
] as const;

const TYPES = [
  { value: "backend", label: "Backend" },
  { value: "full_stack", label: "Full Stack" },
  { value: "dotnet", label: ".NET" },
  { value: "architecture", label: "Architecture" },
  { value: "system_design", label: "System Design" },
  { value: "cloud", label: "Cloud" },
  { value: "devops", label: "DevOps" },
  { value: "behavioral", label: "Behavioral" },
  { value: "ai", label: "AI" },
] as const;

const MODES = [
  { value: "practice", label: "Practice" },
  { value: "mock_15", label: "15m" },
  { value: "mock_30", label: "30m" },
  { value: "mock_60", label: "60m" },
] as const;

const SetupSchema = z.object({
  level: z.enum(["junior", "mid", "senior", "staff", "tech_lead"]),
  interviewType: z.enum([
    "backend",
    "full_stack",
    "dotnet",
    "architecture",
    "system_design",
    "cloud",
    "devops",
    "behavioral",
    "ai",
  ]),
  mode: z.enum(["practice", "mock_15", "mock_30", "mock_60"]),
});

type SetupValues = z.infer<typeof SetupSchema>;

export function InterviewSetupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const initSession = useInterviewSessionStore((s) => s.initSession);

  const form = useForm<SetupValues>({
    resolver: zodResolver(SetupSchema),
    defaultValues: { level: "senior", interviewType: "backend", mode: "practice" },
  });

  function onSubmit(values: SetupValues) {
    setError(null);
    startTransition(async () => {
      const result = await startSession(values.level, values.interviewType, values.mode);
      if (!result.ok || !result.data) {
        setError(result.error ?? "Failed to start session.");
        return;
      }
      initSession(result.data.sessionId, {
        sessionQuestionId: result.data.firstSessionQuestionId,
        prompt: result.data.firstQuestionPrompt,
        followUpDepth: 0,
      });
      router.push(`/interview/${result.data.sessionId}`);
    });
  }

  const level = form.watch("level");
  const interviewType = form.watch("interviewType");
  const mode = form.watch("mode");

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-6 max-w-xl mx-auto px-4 py-6"
    >
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Level</Label>
        <RadioGroup
          value={level}
          onValueChange={(v) => form.setValue("level", v as SetupValues["level"])}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {LEVELS.map((l) => (
            <label
              key={l.value}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-accent/40"
            >
              <RadioGroupItem value={l.value} />
              {l.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Type</Label>
        <RadioGroup
          value={interviewType}
          onValueChange={(v) => form.setValue("interviewType", v as SetupValues["interviewType"])}
          className="grid grid-cols-2 gap-2"
        >
          {TYPES.map((t) => (
            <label
              key={t.value}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-accent/40"
            >
              <RadioGroupItem value={t.value} />
              {t.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Mode</Label>
        <Tabs value={mode} onValueChange={(v) => form.setValue("mode", v as SetupValues["mode"])}>
          <TabsList className="grid grid-cols-4">
            {MODES.map((m) => (
              <TabsTrigger key={m.value} value={m.value}>
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Starting..." : "Start Interview"}
      </Button>
    </form>
  );
}
