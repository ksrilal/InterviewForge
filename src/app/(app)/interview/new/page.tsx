import { InterviewSetupForm } from "./interview-setup-form";

export default function NewInterviewPage() {
  return (
    <div className="flex flex-col">
      <h1 className="px-4 pt-6 text-xl font-semibold tracking-tight max-w-xl mx-auto w-full">
        New Interview
      </h1>
      <InterviewSetupForm />
    </div>
  );
}
