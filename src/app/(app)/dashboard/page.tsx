import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReadinessScoreCard } from "@/components/dashboard/readiness-score-card";
import { RecentSessionsList } from "@/components/dashboard/recent-sessions-list";
import { SkillRadarChart } from "@/components/radar/skill-radar-chart";
import { getDashboardData } from "@/actions/dashboard.actions";
import { getLatestSkillSnapshots } from "@/actions/radar.actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [dashboard, snapshots] = await Promise.all([getDashboardData(), getLatestSkillSnapshots()]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
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
        <Link href="/radar" className="text-sm text-primary hover:underline self-start">
          View full radar →
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Recent Sessions</h2>
        <RecentSessionsList sessions={dashboard.recentSessions} />
        <Link href="/sessions" className="text-sm text-primary hover:underline self-start">
          View all →
        </Link>
      </div>
    </div>
  );
}
