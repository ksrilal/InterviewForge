import { Skeleton } from "@/components/ui/skeleton";

export default function DomainQuestionsLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-4xl mx-auto w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-md" />
      ))}
    </div>
  );
}
