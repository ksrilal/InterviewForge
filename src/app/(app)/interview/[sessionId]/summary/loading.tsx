import { Skeleton } from "@/components/ui/skeleton";

export default function SessionSummaryLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}
