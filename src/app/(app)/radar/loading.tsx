import { Skeleton } from "@/components/ui/skeleton";

export default function RadarLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-2xl mx-auto w-full">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
