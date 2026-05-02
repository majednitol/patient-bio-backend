import { useGlobalDataPool } from "@/hooks/useGlobalDataPool";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, TrendingUp, Clock, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function GlobalPoolSummaryCard() {
  const { stats, isLoading } = useGlobalDataPool();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: "Total Contributions",
      value: stats.totalContributors,
      icon: Globe,
      detail: `${stats.growthStats.thisMonth} this month`,
    },
    {
      label: "Jurisdictions",
      value: stats.jurisdictions.length,
      icon: MapPin,
      detail: stats.jurisdictions.slice(0, 3).join(", ") || "None",
    },
    {
      label: "Growth Rate",
      value: `${stats.growthStats.growthRate >= 0 ? "+" : ""}${stats.growthStats.growthRate}%`,
      icon: TrendingUp,
      detail: "vs last month",
    },
    {
      label: "Data Freshness",
      value: `${stats.freshness.medianAgeDays}d`,
      icon: Clock,
      detail: "median age",
    },
  ];

  const topDiseases = Object.entries(stats.diseaseDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6 pb-2">
        <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
          <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Global Data Pool
        </CardTitle>
        <CardDescription className="text-[10px] sm:text-sm">
          Anonymized health data contributions overview
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {metrics.map((m) => (
            <div key={m.label} className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">{m.label}</span>
              </div>
              <p className="text-lg sm:text-xl font-bold">{m.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{m.detail}</p>
            </div>
          ))}
        </div>

        {topDiseases.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Top Disease Categories</p>
            <div className="flex flex-wrap gap-1.5">
              {topDiseases.map(([name, count]) => (
                <Badge key={name} variant="secondary" className="text-[10px] sm:text-xs">
                  {name}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
