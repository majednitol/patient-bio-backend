import { Skeleton } from "@/components/ui/skeleton";

export function SearchSkeletons() {
  return (
    <div className="p-2 space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-3 sm:py-2.5">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}
