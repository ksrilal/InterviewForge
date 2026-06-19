import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReadinessScoreCard } from "@/components/dashboard/readiness-score-card";
import { RecentSessionsList } from "@/components/dashboard/recent-sessions-list";
import { SkillRadarChart } from "@/components/radar/skill-radar-chart";
import { DomainSelector } from "@/components/domain-selector";
import { getDashboardData } from "@/actions/dashboard.actions";
import { getLatestSkillSnapshots } from "@/actions/radar.actions";
import { listDomains } from "@/actions/domain.actions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ domain?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { domain } = await searchParams;
  const domains = await listDomains();
  const defaultDomain = domains.find((d) => !d.isCustom) ?? domains[0];
  const selectedDomainId = domain ?? defaultDomain?.id;

  if (!selectedDomainId) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6 max-w-4xl mx-auto w-full">
        <p className="text-sm text-muted-foreground">No domains available yet.</p>
      </div>
    );
  }

  const [dashboard, snapshots] = await Promise.all([
    getDashboardData(selectedDomainId),
    getLatestSkillSnapshots(selectedDomainId),
  ]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-4xl mx-auto w-full">
      <DomainSelector domains={domains} selectedDomainId={selectedDomainId} basePath="/dashboard" />

      <ReadinessScoreCard
        score={dashboard.readinessScore}
        level={dashboard.readinessLevel}
        status={dashboard.readinessStatus}
      />

      <Button size="lg" nativeButton={false} render={<Link href="/interview/new" />}>
        Start Interview
      </Button>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Skill Radar</h2>
        <SkillRadarChart data={snapshots.map((s) => ({ axis: s.axis, rollingAverage: s.rollingAverage }))} />
        <Link href={`/radar?domain=${selectedDomainId}`} className="text-sm text-primary hover:underline self-start">
          View full radar →
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Recent Sessions</h2>
        <RecentSessionsList sessions={dashboard.recentSessions} isCustomDomain={dashboard.isCustomDomain} />
        <Link href="/sessions" className="text-sm text-primary hover:underline self-start">
          View all →
        </Link>
      </div>
    </div>
  );
}
