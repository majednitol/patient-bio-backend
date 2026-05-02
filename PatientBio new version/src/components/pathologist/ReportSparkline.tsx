import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { subDays, format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { PathologistReport } from "@/hooks/usePathologistReports";

interface ReportSparklineProps {
  reports: PathologistReport[];
}

export function ReportSparkline({ reports }: ReportSparklineProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(now, 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = startOfDay(subDays(now, 5 - i));
      const count = reports.filter((r) => {
        const created = parseISO(r.created_at);
        return isAfter(created, dayStart) && (i === 6 || isBefore(created, dayEnd));
      }).length;
      return {
        day: format(date, "EEE"),
        count,
      };
    });
    return days;
  }, [reports]);

  const total = chartData.reduce((s, d) => s + d.count, 0);

  if (reports.length === 0) return null;

  return (
    <Card className="diagnostic-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            Reports This Week
          </span>
          <span className="text-2xl font-bold">{total}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                fill="url(#sparkFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
