"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DomainSummary } from "@/actions/domain.actions";

interface DomainSelectorProps {
  domains: DomainSummary[];
  selectedDomainId: string;
  basePath: string;
}

// Lets the dashboard/radar pages pivot their (domain-scoped) skill data
// between domains - implemented as a URL param + router.push rather than
// client state, since the underlying data is fetched server-side per domain.
export function DomainSelector({ domains, selectedDomainId, basePath }: DomainSelectorProps) {
  const router = useRouter();

  return (
    <Select
      value={selectedDomainId}
      onValueChange={(v) => v && router.push(`${basePath}?domain=${v}`)}
    >
      <SelectTrigger className="w-full sm:w-64">
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
  );
}
