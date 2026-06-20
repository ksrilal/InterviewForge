import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/guard";
import { listUsersWithUsage } from "@/actions/admin.actions";
import { AIAccessToggle } from "./ai-access-toggle";
import { DisableUserButton } from "./disable-user-button";

export const dynamic = "force-dynamic";

function formatUsd(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await listUsersWithUsage();

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Every account gets 5 free AI requests by default. Once used up, AI access is disabled
          until you grant full access here.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {users.map((u) => (
          <li key={u.id} className="flex flex-col gap-3 rounded-md border border-border p-3 text-sm">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{u.email ?? u.id}</span>
                  {u.displayName && (
                    <span className="text-muted-foreground">({u.displayName})</span>
                  )}
                  <Badge variant={u.role === "admin" ? "default" : "outline"} className="capitalize">
                    {u.role}
                  </Badge>
                  {u.isDisabled && <Badge variant="destructive">Disabled</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span>
                    {u.aiAccessEnabled
                      ? `Full access (${u.aiRequestCount} requests lifetime)`
                      : `${Math.min(u.aiRequestCount, u.aiTrialLimit)} / ${u.aiTrialLimit} trial requests used`}
                  </span>
                  <span>This month: {formatUsd(u.monthCostUsd)}</span>
                  <span>Total: {formatUsd(u.totalCostUsd)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AIAccessToggle userId={u.id} enabled={u.aiAccessEnabled} />
                <DisableUserButton userId={u.id} email={u.email} disabled={u.isDisabled} />
              </div>
            </div>
          </li>
        ))}

        {users.length === 0 && (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        )}
      </ul>
    </div>
  );
}
