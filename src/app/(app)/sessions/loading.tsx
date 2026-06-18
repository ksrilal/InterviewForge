import { Skeleton } from "@/components/ui/skeleton";

export default function SessionsLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-2xl mx-auto w-full">
      <Skeleton className="h-7 w-32" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-md" />
      ))}
    </div>
  );
}
