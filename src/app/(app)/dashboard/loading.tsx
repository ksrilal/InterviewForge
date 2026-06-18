import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
