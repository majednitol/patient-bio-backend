import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Native-feeling skeleton for the Patient Dashboard.
 * Matches the card-first layout: welcome banner, health-at-a-glance row,
 * quick actions 2x2 grid, and below-the-fold cards.
 */
export function PatientDashboardSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-6 animate-pulse">
      {/* Welcome banner */}
      <div className="rounded-xl sm:rounded-2xl bg-primary/5 p-2.5 sm:p-6">
        <Skeleton className="h-5 w-40 sm:h-8 sm:w-56" />
        <Skeleton className="h-3 w-28 sm:h-4 sm:w-40 mt-1.5" />
      </div>

      {/* Health-at-a-glance 3-column row */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-1.5 sm:p-4 flex items-center gap-1.5 sm:gap-3">
            <Skeleton className="h-6 w-6 sm:h-10 sm:w-10 rounded-lg shrink-0" />
            <div className="min-w-0 space-y-1">
              <Skeleton className="h-2 w-8 sm:h-3 sm:w-12" />
              <Skeleton className="h-3 w-6 sm:h-5 sm:w-10" />
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions 2x2 grid */}
      <div>
        <Skeleton className="h-4 w-24 sm:h-6 sm:w-32 mb-2 sm:mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-6 flex flex-col items-center">
                <Skeleton className="h-10 w-10 sm:h-14 sm:w-14 rounded-full mb-1.5 sm:mb-3" />
                <Skeleton className="h-3 w-16 sm:h-4 sm:w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Below-fold cards */}
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-52 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-28 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
