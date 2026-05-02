import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Cpu } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AccessTypeStats {
  accessor_type: string;
  count: number;
  latencyMs: number;
}

export default function EdgeFunctionPerfCard() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-edge-function-perf"],
    queryFn: async (): Promise<{ stats: AccessTypeStats[]; avgMs: number; totalCount: number }> => {
      const start = performance.now();
      const { data: logs, error } = await supabase
        .from("access_logs")
        .select("accessor_type")
        .order("accessed_at", { ascending: false })
        .limit(500);

      const queryLatency = Math.round(performance.now() - start);

      if (error) throw error;

      // Group by accessor_type with real counts
      const grouped: Record<string, number> = {};
      (logs || []).forEach((log) => {
        const type = log.accessor_type || "unknown";
        grouped[type] = (grouped[type] || 0) + 1;
      });

      const stats: AccessTypeStats[] = Object.entries(grouped)
        .map(([accessor_type, count]) => ({
          accessor_type,
          count,
          latencyMs: queryLatency,
        }))
        .sort((a, b) => b.count - a.count);

      const totalCount = logs?.length || 0;

      return { stats, avgMs: queryLatency, totalCount };
    },
    staleTime: STALE_TIMES.SHORT,
    refetchInterval: 120000,
  });

  const getCountBadge = (count: number, total: number) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    if (pct > 30) return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">{Math.round(pct)}%</Badge>;
    if (pct > 10) return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">{Math.round(pct)}%</Badge>;
    return <Badge variant="outline" className="text-[10px]">{Math.round(pct)}%</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          {t("adminHealth.edgeFunctionPerf")}
        </CardTitle>
        <CardDescription>
          {t("adminHealth.edgeFunctionPerfDesc", { avg: data?.avgMs ?? 0, errors: 0 })}
          {" "}&middot; {data?.totalCount ?? 0} recent requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (data?.stats?.length || 0) === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No access log data available</p>
        ) : (
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {(data?.stats || []).map((stat, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-sm border-b last:border-0">
                <span className="font-medium truncate max-w-[160px]">{stat.accessor_type}</span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {stat.count} hits
                  </span>
                  {getCountBadge(stat.count, data?.totalCount || 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
