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
import type { DomainSummary } from "@/actions/domain.actions";

interface SessionFiltersBarProps {
  domains: DomainSummary[];
}

export function SessionFiltersBar({ domains }: SessionFiltersBarProps) {
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
      router.push(`/sessions?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("search", searchInput || null);
  }

  const hasActiveFilters = searchParams.get("domain") || searchParams.get("search");

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <Input
          placeholder="Search by domain name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Select
          value={searchParams.get("domain") ?? ""}
          onValueChange={(value) => updateParam("domain", value || null)}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Domain">
              {(value: string | null) => {
                if (!value) return "All domains";
                const d = domains.find((domain) => domain.id === value);
                return d ? `${d.name}${d.isCustom ? " (private)" : ""}` : "All domains";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All domains</SelectItem>
            {domains.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
                {d.isCustom ? " (private)" : ""}
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
              router.push("/sessions");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
