"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startSession } from "@/actions/session.actions";
import { listLevels } from "@/actions/question.actions";
import { useInterviewSessionStore } from "@/store/interview-session.store";
import type { DomainSummary } from "@/actions/domain.actions";
import type { InterviewLevel } from "@/types/domain";

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

const PERSONALITIES = [
  { value: "supportive_mentor", label: "Supportive Mentor", description: "Encouraging, gives hints" },
  { value: "professional", label: "Professional", description: "Balanced and realistic" },
  { value: "strict_senior", label: "Strict Senior Engineer", description: "Challenges assumptions" },
  { value: "tough_reviewer", label: "Tough Reviewer", description: "Critical, pushes deeper" },
  { value: "faang_interviewer", label: "FAANG Interviewer", description: "Fast-paced, system design" },
] as const;

const COMPANY_TYPES = [
  { value: "none", label: "Any" },
  { value: "startup", label: "Startup" },
  { value: "enterprise", label: "Enterprise" },
  { value: "product", label: "Product Company" },
  { value: "faang", label: "FAANG" },
  { value: "remote_first", label: "Remote-First" },
] as const;

const SetupSchema = z.object({
  domainId: z.string().min(1, "Pick a domain"),
  level: z.enum(["junior", "mid", "senior", "staff", "tech_lead"]),
  // Required by the sessions table regardless of domain, but only meaningful
  // (and only shown) for the global Software Engineering domain - custom
  // domains are scoped by domain + level alone.
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
  personality: z.enum([
    "supportive_mentor",
    "professional",
    "strict_senior",
    "tough_reviewer",
    "faang_interviewer",
  ]),
  companyType: z.enum(["none", "startup", "enterprise", "product", "faang", "remote_first"]),
});

type SetupValues = z.infer<typeof SetupSchema>;

interface InterviewSetupFormProps {
  domains: DomainSummary[];
}

export function InterviewSetupForm({ domains }: InterviewSetupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [availableLevels, setAvailableLevels] = useState<InterviewLevel[]>(LEVELS.map((l) => l.value));
  const [, startLevelsTransition] = useTransition();
  const initSession = useInterviewSessionStore((s) => s.initSession);

  const defaultDomain = domains.find((d) => !d.isCustom) ?? domains[0];

  const form = useForm<SetupValues>({
    resolver: zodResolver(SetupSchema),
    defaultValues: {
      domainId: defaultDomain?.id ?? "",
      level: "senior",
      interviewType: "backend",
      mode: "practice",
      personality: "professional",
      companyType: "none",
    },
  });

  function onSubmit(values: SetupValues) {
    setError(null);
    startTransition(async () => {
      const result = await startSession(
        values.domainId,
        values.level,
        values.interviewType,
        values.mode,
        values.personality,
        values.companyType === "none" ? null : values.companyType
      );
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

  const domainId = form.watch("domainId");
  const level = form.watch("level");
  const interviewType = form.watch("interviewType");
  const mode = form.watch("mode");
  const personality = form.watch("personality");
  const companyType = form.watch("companyType");

  const selectedDomain = domains.find((d) => d.id === domainId);
  const isCustomDomain = selectedDomain?.isCustom ?? false;

  // Mirrors the question bank filters - only offer levels this domain's
  // questions actually have (a brand new or small custom domain may not
  // have e.g. Staff/Tech Lead questions yet), instead of always showing all
  // 5 regardless of domain.
  useEffect(() => {
    if (!domainId) return;
    startLevelsTransition(async () => {
      const levels = await listLevels(domainId);
      if (levels.length === 0) {
        setAvailableLevels(LEVELS.map((l) => l.value));
        return;
      }
      setAvailableLevels(levels);
      if (!levels.includes(form.getValues("level"))) {
        form.setValue("level", levels[0]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainId]);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-6 max-w-4xl mx-auto px-4 py-6"
    >
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Domain</Label>
        <Select value={domainId} onValueChange={(v) => v && form.setValue("domainId", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a domain">
              {(value: string | null) => {
                const d = domains.find((domain) => domain.id === value);
                return d ? `${d.name}${d.isCustom ? " (private)" : ""}` : "Select a domain";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {domains.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
                {d.isCustom ? " (private)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isCustomDomain && (
          <p className="text-xs text-muted-foreground">
            Custom domains draw questions from your own uploaded content - level still applies,
            but there&apos;s no fixed Type breakdown for it.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Level</Label>
        <RadioGroup
          value={level}
          onValueChange={(v) => form.setValue("level", v as SetupValues["level"])}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {LEVELS.filter((l) => availableLevels.includes(l.value)).map((l) => (
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

      {!isCustomDomain && (
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
      )}

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

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Interviewer</Label>
        <RadioGroup
          value={personality}
          onValueChange={(v) => form.setValue("personality", v as SetupValues["personality"])}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {PERSONALITIES.map((p) => (
            <label
              key={p.value}
              className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-accent/40"
            >
              <RadioGroupItem value={p.value} className="mt-0.5" />
              <span className="flex flex-col">
                <span>{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.description}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Company Type</Label>
        <RadioGroup
          value={companyType}
          onValueChange={(v) => form.setValue("companyType", v as SetupValues["companyType"])}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {COMPANY_TYPES.map((c) => (
            <label
              key={c.value}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-accent/40"
            >
              <RadioGroupItem value={c.value} />
              {c.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={isPending || !domainId}>
        {isPending ? "Starting..." : "Start Interview"}
      </Button>
    </form>
  );
}
