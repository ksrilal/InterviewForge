import { Skeleton } from "@/components/ui/skeleton";

export default function InterviewSessionLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}
