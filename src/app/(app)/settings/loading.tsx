import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-4xl mx-auto w-full">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
