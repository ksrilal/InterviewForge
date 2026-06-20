"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setLastDomainCookie, type DomainSummary } from "@/actions/domain.actions";

interface DomainSelectorProps {
  domains: DomainSummary[];
  selectedDomainId: string;
  basePath: string;
}

// Lets the dashboard/radar pages pivot their (domain-scoped) skill data
// between domains - implemented as a URL param + router.push rather than
// client state, since the underlying data is fetched server-side per domain.
// Also persists the choice in a cookie so a fresh visit with no ?domain=
// param (e.g. clicking "Home" in the nav) remembers it instead of always
// resetting to the global domain.
export function DomainSelector({ domains, selectedDomainId, basePath }: DomainSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(domainId: string) {
    setLastDomainCookie(domainId);
    startTransition(() => {
      router.push(`${basePath}?domain=${domainId}`);
    });
  }

  return (
    <Select
      value={selectedDomainId}
      onValueChange={(v) => v && handleChange(v)}
      disabled={isPending}
    >
      <SelectTrigger className="w-full sm:w-64">
        <SelectValue placeholder="Select a domain">
          {(value: string | null) => {
            const d = domains.find((domain) => domain.id === value);
            return d ? `${d.name}${d.isCustom ? " (private)" : ""}` : "Select a domain";
          }}
        </SelectValue>
        {isPending && <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />}
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
  );
}
