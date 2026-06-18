"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const LEVELS = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff" },
  { value: "tech_lead", label: "Tech Lead" },
];

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
];

interface QuestionFiltersBarProps {
  categories: string[];
}

export function QuestionFiltersBar({ categories }: QuestionFiltersBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`/questions?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("search", searchInput || null);
  }

  const hasActiveFilters =
    searchParams.get("level") ||
    searchParams.get("interviewType") ||
    searchParams.get("category") ||
    searchParams.get("search");

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <Input
          placeholder="Search questions..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Select
          value={searchParams.get("level") ?? ""}
          onValueChange={(value) => updateParam("level", value || null)}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All levels</SelectItem>
            {LEVELS.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("interviewType") ?? ""}
          onValueChange={(value) => updateParam("interviewType", value || null)}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("category") ?? ""}
          onValueChange={(value) => updateParam("category", value || null)}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              router.push("/questions");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
