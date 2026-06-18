import { getLatestSkillSnapshots } from "@/actions/radar.actions";
import { RadarClient } from "./radar-client";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const snapshots = await getLatestSkillSnapshots();

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-4xl mx-auto w-full">
      <h1 className="text-xl font-semibold tracking-tight">Skill Radar</h1>
      <RadarClient snapshots={snapshots} />
    </div>
  );
}
