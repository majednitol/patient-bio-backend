import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Skeleton matching the Prescriptions / Health Records page layout:
 * search bar, horizontal category pills, and 2-column record card grid.
 */
export function RecordListSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-pulse">
      {/* Search bar */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <Skeleton className="h-9 sm:h-10 w-full rounded-md" />
          {/* Category pills */}
          <div className="flex gap-1.5 mt-3 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-8 w-16 sm:w-20 rounded-full shrink-0" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Record cards grid */}
      <Card>
        <CardHeader className="px-3 sm:px-6">
          <Skeleton className="h-5 w-32 sm:h-6 sm:w-40" />
          <Skeleton className="h-3 w-44 sm:h-4 sm:w-56 mt-1" />
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden rounded-xl">
                {/* Thumbnail */}
                <Skeleton className="w-full h-24 sm:h-28 rounded-t-xl" />
                {/* Content */}
                <CardContent className="p-2.5 sm:p-3.5 space-y-2">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
