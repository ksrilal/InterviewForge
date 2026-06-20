import { Skeleton } from "@/components/ui/skeleton";

export default function NewInterviewLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-4xl mx-auto w-full">
      <Skeleton className="h-7 w-36" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}
