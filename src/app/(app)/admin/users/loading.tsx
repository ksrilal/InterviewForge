import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-5xl mx-auto w-full">
      <Skeleton className="h-7 w-24" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-md" />
      ))}
    </div>
  );
}
