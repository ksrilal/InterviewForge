import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { listDomains } from "@/actions/domain.actions";
import { DomainSearchBar } from "./domain-search-bar";
import { CreateDomainDialog } from "./create-domain-dialog";
import { DeleteDomainButton } from "./delete-domain-button";

export const dynamic = "force-dynamic";

interface QuestionsPageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const { search } = await searchParams;
  const domains = await listDomains(search);

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Question Bank</h1>
        <CreateDomainDialog />
      </div>

      <DomainSearchBar />

      <ul className="flex flex-col gap-2">
        {domains.map((d) => (
          <li key={d.id} className="flex items-center gap-2">
            <Link
              href={`/questions/domain/${d.id}`}
              className="flex-1 flex flex-col gap-1 rounded-md border border-border px-3 py-2.5 text-sm hover:bg-accent/40"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{d.name}</span>
                {d.isCustom && <Badge variant="outline">Private</Badge>}
              </div>
              {d.description && (
                <span className="text-xs text-muted-foreground">{d.description}</span>
              )}
            </Link>
            {d.isCustom && <DeleteDomainButton domainId={d.id} domainName={d.name} />}
          </li>
        ))}

        {domains.length === 0 && (
          <p className="text-sm text-muted-foreground">No domains match your search.</p>
        )}
      </ul>
    </div>
  );
}
