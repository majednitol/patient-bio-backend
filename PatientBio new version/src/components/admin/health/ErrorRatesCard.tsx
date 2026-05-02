import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { subDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { errorRateSeverity, severityBadgeClass, RECOMMENDATIONS } from "@/utils/healthSeverity";

export default function ErrorRatesCard() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-error-rates"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const [
        { count: cancelledAppts },
        { count: totalAppts },
        { count: rejectedRequests },
        { count: totalRequests },
        { count: abnormalReports },
        { count: totalReports },
      ] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "cancelled").gte("created_at", sevenDaysAgo),
        supabase.from("appointments").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
        supabase.from("data_access_requests").select("id", { count: "exact", head: true }).eq("status", "rejected").gte("created_at", sevenDaysAgo),
        supabase.from("data_access_requests").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
        supabase.from("pathologist_reports").select("id", { count: "exact", head: true }).eq("has_abnormal_values", true).gte("created_at", sevenDaysAgo),
        supabase.from("pathologist_reports").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      ]);

      const metrics = [
        {
          name: t("adminHealth.cancelledAppointments"),
          failed: cancelledAppts || 0,
          total: totalAppts || 0,
          rate: totalAppts ? ((cancelledAppts || 0) / totalAppts * 100).toFixed(1) : "0.0",
        },
        {
          name: t("adminHealth.rejectedDataRequests"),
          failed: rejectedRequests || 0,
          total: totalRequests || 0,
          rate: totalRequests ? ((rejectedRequests || 0) / totalRequests * 100).toFixed(1) : "0.0",
        },
        {
          name: t("adminHealth.abnormalLabResults"),
          failed: abnormalReports || 0,
          total: totalReports || 0,
          rate: totalReports ? ((abnormalReports || 0) / totalReports * 100).toFixed(1) : "0.0",
        },
      ];

      const overallRate = metrics.reduce((s, m) => s + m.failed, 0) /
        Math.max(metrics.reduce((s, m) => s + m.total, 0), 1) * 100;

      return { metrics, overallRate: overallRate.toFixed(1) };
    },
    staleTime: STALE_TIMES.ANALYTICS,
    refetchInterval: 300000,
  });

  const getRateBadge = (rate: string) => {
    const r = parseFloat(rate);
    const severity = errorRateSeverity(r);
    return <Badge variant="outline" className={severityBadgeClass(severity)}>{rate}%</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {t("adminHealth.errorFailureRates")}
        </CardTitle>
        <CardDescription>
          {t("adminHealth.sevenDayRolling", { rate: data?.overallRate || "0.0" })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {(data?.metrics || []).map((m) => (
              <div key={m.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{t("adminHealth.ofTotal", { failed: m.failed, total: m.total })}</p>
                </div>
                {getRateBadge(m.rate)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}