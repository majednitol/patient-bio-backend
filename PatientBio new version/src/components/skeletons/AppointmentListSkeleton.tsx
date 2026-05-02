import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Skeleton matching the Appointments page layout:
 * header with stats row, date-grouped stacked appointment cards.
 */
export function AppointmentListSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-36 sm:h-8 sm:w-48" />
          <Skeleton className="h-3 w-24 sm:h-4 sm:w-32 mt-1" />
        </div>
        <Skeleton className="h-8 w-24 sm:h-10 sm:w-32 rounded-md" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-3 sm:p-5 flex items-center gap-2 sm:gap-3">
              <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-6 sm:h-7 sm:w-8" />
                <Skeleton className="h-2 w-12 sm:h-3 sm:w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Date group + appointment cards */}
      {[1, 2].map((group) => (
        <div key={group} className="space-y-2">
          {/* Date header pill */}
          <Skeleton className="h-7 w-28 rounded-full" />
          {/* Cards */}
          {[1, 2].map((card) => (
            <Card key={card} className="diagnostic-card">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
