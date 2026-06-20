import { Skeleton } from "@/components/ui/skeleton";

export default function QuestionDetailLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
