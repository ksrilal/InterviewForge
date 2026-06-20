import { InterviewSetupForm } from "./interview-setup-form";
import { listDomains, resolveDefaultDomainId } from "@/actions/domain.actions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ domain?: string }>;
}

export default async function NewInterviewPage({ searchParams }: PageProps) {
  const { domain } = await searchParams;
  const domains = await listDomains();
  const defaultDomainId = await resolveDefaultDomainId(domains, domain);

  return (
    <div className="flex flex-col">
      <h1 className="px-4 pt-6 text-xl font-semibold tracking-tight max-w-4xl mx-auto w-full">
        New Interview
      </h1>
      <InterviewSetupForm domains={domains} defaultDomainId={defaultDomainId} />
    </div>
  );
}
