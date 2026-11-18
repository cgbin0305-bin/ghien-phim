import { PosterSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-12 px-4 py-10 sm:px-6 sm:py-14 animate-fade-in">
      <div className="panel oriental-frame space-y-4 p-6 sm:p-10">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-11 w-3/5 max-w-md" />
        <Skeleton className="h-4 w-4/5 max-w-xl" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-28" />
        </div>
      </div>

      <div className="space-y-5">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <PosterSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

