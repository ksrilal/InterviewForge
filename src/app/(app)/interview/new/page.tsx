import { InterviewSetupForm } from "./interview-setup-form";
import { listDomains } from "@/actions/domain.actions";

export const dynamic = "force-dynamic";

export default async function NewInterviewPage() {
  const domains = await listDomains();

  return (
    <div className="flex flex-col">
      <h1 className="px-4 pt-6 text-xl font-semibold tracking-tight max-w-4xl mx-auto w-full">
        New Interview
      </h1>
      <InterviewSetupForm domains={domains} />
    </div>
  );
}
