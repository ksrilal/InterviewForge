import { Skeleton } from "@/components/ui/skeleton";

export default function PlanLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-4xl mx-auto w-full">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
