import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { differenceInHours, parseISO } from "date-fns";

interface TATBreakdownChartProps {
  reports: Array<{
    created_at: string;
    updated_at: string;
    is_shared_with_doctor?: boolean;
    is_shared_with_patient?: boolean;
    report_type?: string | null;
  }>;
}

const CHART_COLORS = [
  "hsl(173, 58%, 39%)",  // diagnostic-primary (teal)
  "hsl(187, 47%, 55%)",  // diagnostic-secondary (cyan)
  "hsl(142, 52%, 45%)",  // diagnostic-accent (green)
];

export function TATBreakdownChart({ reports }: TATBreakdownChartProps) {
  const tatData = useMemo(() => {
    // Group by report type and calculate TAT
    const reportTypeMap: Record<
      string,
      { type: string; hours: number[]; count: number }
    > = {};

    const completedReports = reports.filter(
      (r) => r.is_shared_with_doctor || r.is_shared_with_patient
    );

    completedReports.forEach((report) => {
      const type = report.report_type || "general";
      const created = parseISO(report.created_at);
      const updated = parseISO(report.updated_at);
      const hours = differenceInHours(updated, created);

      if (!reportTypeMap[type]) {
        reportTypeMap[type] = { type, hours: [], count: 0 };
      }
      reportTypeMap[type].hours.push(hours);
      reportTypeMap[type].count += 1;
    });

    // Calculate average TAT per type
    const data = Object.values(reportTypeMap)
      .map((item) => ({
        name: item.type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        avgTAT: Math.round(item.hours.reduce((a, b) => a + b, 0) / item.hours.length * 10) / 10,
        minTAT: Math.min(...item.hours),
        maxTAT: Math.max(...item.hours),
        count: item.count,
      }))
      .sort((a, b) => a.avgTAT - b.avgTAT);

    return data;
  }, [reports]);

  // Calculate fastest and slowest TAT
  const tatStats = useMemo(() => {
    if (tatData.length === 0) return { fastest: null, slowest: null };
    return {
      fastest: tatData.reduce((a, b) => (a.avgTAT < b.avgTAT ? a : b)),
      slowest: tatData.reduce((a, b) => (a.avgTAT > b.avgTAT ? a : b)),
    };
  }, [tatData]);

  if (tatData.length === 0) {
    return (
      <Card className="diagnostic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
            TAT by Test Type
          </CardTitle>
          <CardDescription>Average turnaround time per report type</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground">
          No completed reports yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="diagnostic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
            TAT by Test Type
          </CardTitle>
          <CardDescription>Average turnaround time per report type (hours)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tatData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis label={{ value: "Hours", angle: -90, position: "insideLeft" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value) => [`${value}h`, "Avg TAT"]}
              />
              <Legend />
              <Bar
                dataKey="avgTAT"
                name="Average TAT"
                fill="hsl(173, 58%, 39%)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Fastest/Slowest TAT Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tatStats.fastest && (
          <Card className="diagnostic-card border-[hsl(var(--diagnostic-accent)/0.3)]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fastest TAT</p>
                  <p className="text-2xl font-bold text-[hsl(var(--diagnostic-accent))]">
                    {tatStats.fastest.avgTAT}h
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{tatStats.fastest.name}</p>
                </div>
                <Badge variant="secondary">{tatStats.fastest.count} reports</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {tatStats.slowest && (
          <Card className="diagnostic-card border-orange-300/30">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Slowest TAT</p>
                  <p className="text-2xl font-bold text-orange-600">{tatStats.slowest.avgTAT}h</p>
                  <p className="text-xs text-muted-foreground mt-1">{tatStats.slowest.name}</p>
                </div>
                <Badge variant="secondary">{tatStats.slowest.count} reports</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
