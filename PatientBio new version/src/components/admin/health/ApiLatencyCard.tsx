import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { latencySeverity, severityBadgeClass, RECOMMENDATIONS } from "@/utils/healthSeverity";

interface LatencyResult {
  endpoint: string;
  latencyMs: number;
  status: "fast" | "normal" | "slow";
}

export default function ApiLatencyCard() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-api-latency"],
    queryFn: async (): Promise<LatencyResult[]> => {
      const endpoints = [
        { name: "user_profiles", table: "user_profiles" as const },
        { name: "health_records", table: "health_records" as const },
        { name: "appointments", table: "appointments" as const },
        { name: "prescriptions", table: "prescriptions" as const },
        { name: "access_logs", table: "access_logs" as const },
        { name: "notifications", table: "notifications" as const },
      ];

      const results = await Promise.all(
        endpoints.map(async (ep) => {
          const start = performance.now();
          await supabase.from(ep.table).select("id", { count: "exact", head: true });
          const elapsed = Math.round(performance.now() - start);
          return {
            endpoint: ep.name,
            latencyMs: elapsed,
            status: (elapsed < 200 ? "fast" : elapsed < 500 ? "normal" : "slow") as LatencyResult["status"],
          };
        })
      );

      return results.sort((a, b) => b.latencyMs - a.latencyMs);
    },
    staleTime: STALE_TIMES.ANALYTICS,
    refetchInterval: 120000,
  });

  const avgLatency = data ? Math.round(data.reduce((s, r) => s + r.latencyMs, 0) / data.length) : 0;
  const overallSeverity = latencySeverity(avgLatency);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fast": return severityBadgeClass("healthy");
      case "normal": return severityBadgeClass("warning");
      case "slow": return severityBadgeClass("error");
      default: return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          {t("adminHealth.apiLatency")}
        </CardTitle>
        <CardDescription>
          {t("adminHealth.liveEndpointTimes", { avg: avgLatency })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {(data || []).map((r) => (
              <div key={r.endpoint} className="flex items-center justify-between py-1.5">
                <span className="text-sm font-medium">{r.endpoint.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground tabular-nums">{r.latencyMs}ms</span>
                  <Badge variant="outline" className={getStatusColor(r.status)}>
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}