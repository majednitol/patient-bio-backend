import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSkeleton, useRechartsComponents } from "@/components/shared/LazyChart";
import { Bed, TrendingUp, TrendingDown } from "lucide-react";
import { format, subDays, eachDayOfInterval } from "date-fns";

interface Props {
  hospitalId: string;
}

export default function BedOccupancyTrendChart({ hospitalId }: Props) {
  const { components, isLoading: chartsLoading } = useRechartsComponents();

  const { data: trendData, isLoading } = useQuery({
    queryKey: ["bed-occupancy-trend", hospitalId],
    queryFn: async () => {
      const days = 14;
      const startDate = subDays(new Date(), days);

      const [bedsRes, admissionsRes] = await Promise.all([
        supabase
          .from("beds")
          .select("id, status")
          .eq("hospital_id", hospitalId),
        supabase
          .from("admissions")
          .select("id, admission_date, actual_discharge, status, bed_id")
          .eq("hospital_id", hospitalId)
          .gte("admission_date", subDays(new Date(), 90).toISOString()),
      ]);

      const totalBeds = bedsRes.data?.length || 0;
      if (totalBeds === 0) return null;

      const admissions = admissionsRes.data || [];
      const interval = eachDayOfInterval({
        start: startDate,
        end: new Date(),
      });

      const trend = interval.map((day) => {
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        // Count beds occupied on this day
        const occupied = admissions.filter((a) => {
          const admDate = new Date(a.admission_date);
          const disDate = a.actual_discharge ? new Date(a.actual_discharge) : new Date();
          return admDate <= dayEnd && disDate >= day;
        }).length;

        const rate = Math.round((occupied / totalBeds) * 100);
        return {
          date: format(day, "MMM d"),
          occupancy: rate,
          occupied,
          available: totalBeds - occupied,
        };
      });

      const currentRate = trend[trend.length - 1]?.occupancy || 0;
      const prevRate = trend[trend.length - 8]?.occupancy || currentRate;
      const weekChange = currentRate - prevRate;

      return { trend, totalBeds, currentRate, weekChange };
    },
    enabled: !!hospitalId,
  });

  if (isLoading || chartsLoading) {
    return <ChartSkeleton height={320} />;
  }

  if (!trendData || !components) return null;

  const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } = components;
  const { trend, totalBeds, currentRate, weekChange } = trendData;

  const getOccupancyColor = (rate: number) => {
    if (rate >= 85) return "text-red-600";
    if (rate >= 60) return "text-amber-600";
    return "text-green-600";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bed className="h-4 w-4" />
              Bed Occupancy Trend
            </CardTitle>
            <CardDescription>14-day occupancy rate across {totalBeds} beds</CardDescription>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${getOccupancyColor(currentRate)}`}>
              {currentRate}%
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {weekChange > 0 ? (
                <TrendingUp className="h-3 w-3 text-red-500" />
              ) : weekChange < 0 ? (
                <TrendingDown className="h-3 w-3 text-green-500" />
              ) : null}
              <span>{weekChange > 0 ? "+" : ""}{weekChange}% vs last week</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-xs" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => {
                  if (name === "occupancy") return [`${value}%`, "Occupancy"];
                  return [value, name];
                }}
              />
              <Area
                type="monotone"
                dataKey="occupancy"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#occupancyGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
