import type { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DomainRow } from "@/lib/supabase/types";

type SupabaseClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

export interface DomainLabel {
  name: string;
  isCustom: boolean;
}

// Small id->name/isCustom lookup for displaying a session's domain in
// history views (dashboard, sessions list, summary). Sessions only store
// domain_id, and a custom domain's stored interview_type is a meaningless
// placeholder (see session.actions.ts#startSession), so the domain name -
// not interview_type - is the real label for those.
export async function getDomainLabels(
  supabase: SupabaseClient,
  domainIds: string[]
): Promise<Map<string, DomainLabel>> {
  const uniqueIds = Array.from(new Set(domainIds));
  const map = new Map<string, DomainLabel>();
  if (uniqueIds.length === 0) return map;

  const { data } = await supabase.from("domains").select("*").in("id", uniqueIds);
  for (const row of (data ?? []) as DomainRow[]) {
    map.set(row.id, { name: row.name, isCustom: row.owner_user_id !== null });
  }
  return map;
}
