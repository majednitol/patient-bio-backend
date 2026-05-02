import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useTranslation } from "react-i18next";

export function EngagementTrendsCard() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-engagement-metrics"],
    queryFn: async () => {
      const { data: counts, error } = await supabase.rpc("get_active_user_counts");
      if (error) throw error;

      const rawRow = Array.isArray(counts) ? counts[0] : counts;
      const row = {
        hourly_active: Number(rawRow?.hourly_active ?? 0),
        daily_active: Number(rawRow?.daily_active ?? 0),
        weekly_active: Number(rawRow?.weekly_active ?? 0),
        monthly_active: Number(rawRow?.monthly_active ?? 0),
        total_users: Number(rawRow?.total_users ?? 0),
      };

      const { data: logs } = await supabase
        .from("access_logs")
        .select("accessed_at")
        .gte("accessed_at", new Date(Date.now() - 7 * 86400000).toISOString())
        .order("accessed_at", { ascending: false })
        .limit(500);

      const hourCounts: number[] = new Array(24).fill(0);
      (logs || []).forEach((log) => {
        const hour = new Date(log.accessed_at).getHours();
        hourCounts[hour]++;
      });

      const heatmapData = hourCounts.map((count, hour) => ({
        hour: `${hour.toString().padStart(2, "0")}:00`,
        activity: count,
      }));

      return {
        dau: row.daily_active,
        wau: row.weekly_active,
        mau: row.monthly_active,
        total: row.total_users,
        dauWauRatio: row.weekly_active > 0 ? Math.round((row.daily_active / row.weekly_active) * 100) : 0,
        dauMauRatio: row.monthly_active > 0 ? Math.round((row.daily_active / row.monthly_active) * 100) : 0,
        heatmapData,
      };
    },
    refetchInterval: 120000,
  });

  const chartConfig = {
    activity: { label: t("adminHealth.activity"), color: "hsl(var(--chart-4))" },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const ratios = [
    { label: "DAU", value: data?.dau ?? 0 },
    { label: "WAU", value: data?.wau ?? 0 },
    { label: "MAU", value: data?.mau ?? 0 },
    { label: "DAU/WAU", value: `${data?.dauWauRatio ?? 0}%` },
    { label: "DAU/MAU", value: `${data?.dauMauRatio ?? 0}%` },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {t("adminHealth.userEngagement")}
        </CardTitle>
        <CardDescription>{t("adminHealth.userEngagementDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {ratios.map((r) => (
            <div key={r.label} className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-[10px] sm:text-xs text-muted-foreground">{r.label}</p>
              <p className="text-sm sm:text-lg font-bold">{r.value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {t("adminHealth.activityByHour")}
          </p>
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.heatmapData || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="activity" name={t("adminHealth.requests")} fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
