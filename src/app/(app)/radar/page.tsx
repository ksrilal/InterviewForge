import { getLatestSkillSnapshots } from "@/actions/radar.actions";
import { listDomains, resolveDefaultDomainId } from "@/actions/domain.actions";
import { DomainSelector } from "@/components/domain-selector";
import { RadarClient } from "./radar-client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ domain?: string }>;
}

export default async function RadarPage({ searchParams }: PageProps) {
  const { domain } = await searchParams;
  const domains = await listDomains();
  const selectedDomainId = await resolveDefaultDomainId(domains, domain);

  if (!selectedDomainId) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6 max-w-4xl mx-auto w-full">
        <h1 className="text-xl font-semibold tracking-tight">Skill Radar</h1>
        <p className="text-sm text-muted-foreground">No domains available yet.</p>
      </div>
    );
  }

  const snapshots = await getLatestSkillSnapshots(selectedDomainId);

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-4xl mx-auto w-full">
      <h1 className="text-xl font-semibold tracking-tight">Skill Radar</h1>
      <DomainSelector domains={domains} selectedDomainId={selectedDomainId} basePath="/radar" />
      <RadarClient snapshots={snapshots} domainId={selectedDomainId} />
    </div>
  );
}
