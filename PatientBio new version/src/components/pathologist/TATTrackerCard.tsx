import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePathologistReports } from "@/hooks/usePathologistReports";
import { Clock, TrendingDown, TrendingUp, Minus, BarChart3 } from "lucide-react";
import { differenceInHours, differenceInMinutes, parseISO } from "date-fns";

interface TATMetrics {
  averageHours: number;
  medianHours: number;
  totalCompleted: number;
  withinSLA: number;
  slaPercentage: number;
  breakdown: { label: string; count: number; percentage: number }[];
}

const SLA_THRESHOLD_HOURS = 48; // 48-hour SLA target

function computeTATMetrics(reports: { created_at: string | null; updated_at: string | null; is_shared_with_doctor: boolean; is_shared_with_patient: boolean }[]): TATMetrics {
  // Only completed reports (shared with doctor or patient)
  const completed = reports.filter(
    (r) => (r.is_shared_with_doctor || r.is_shared_with_patient) && r.created_at && r.updated_at
  );

  if (completed.length === 0) {
    return { averageHours: 0, medianHours: 0, totalCompleted: 0, withinSLA: 0, slaPercentage: 100, breakdown: [] };
  }

  const durations = completed.map((r) => {
    const created = parseISO(r.created_at!);
    const updated = parseISO(r.updated_at!);
    return differenceInMinutes(updated, created) / 60; // hours as float
  }).sort((a, b) => a - b);

  const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
  const median = durations[Math.floor(durations.length / 2)];
  const withinSLA = durations.filter((d) => d <= SLA_THRESHOLD_HOURS).length;

  // Breakdown by time ranges
  const ranges = [
    { label: "< 12h", max: 12 },
    { label: "12-24h", max: 24 },
    { label: "24-48h", max: 48 },
    { label: "> 48h", max: Infinity },
  ];

  const breakdown = ranges.map((range, i) => {
    const min = i === 0 ? 0 : ranges[i - 1].max;
    const count = durations.filter((d) => d >= min && d < range.max).length;
    return { label: range.label, count, percentage: Math.round((count / durations.length) * 100) };
  });

  return {
    averageHours: Math.round(avg * 10) / 10,
    medianHours: Math.round(median * 10) / 10,
    totalCompleted: completed.length,
    withinSLA,
    slaPercentage: Math.round((withinSLA / completed.length) * 100),
    breakdown,
  };
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function getSLAStatus(percentage: number): { label: string; color: string; icon: typeof TrendingDown } {
  if (percentage >= 90) return { label: "Excellent", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: TrendingDown };
  if (percentage >= 70) return { label: "On Track", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Minus };
  return { label: "Needs Attention", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: TrendingUp };
}

export function TATTrackerCard() {
  const { reports } = usePathologistReports();

  const metrics = useMemo(() => computeTATMetrics(reports), [reports]);
  const slaStatus = getSLAStatus(metrics.slaPercentage);
  const SLAIcon = slaStatus.icon;

  if (metrics.totalCompleted === 0) {
    return (
      <Card className="diagnostic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            Turnaround Time
          </CardTitle>
          <CardDescription>Complete and share reports to see TAT metrics</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="diagnostic-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            Turnaround Time
          </CardTitle>
          <Badge className={slaStatus.color}>
            <SLAIcon className="h-3 w-3 mr-1" />
            {slaStatus.label}
          </Badge>
        </div>
        <CardDescription>
          {SLA_THRESHOLD_HOURS}h SLA target · {metrics.totalCompleted} reports analyzed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-foreground">{formatDuration(metrics.averageHours)}</p>
            <p className="text-[10px] text-muted-foreground font-medium">AVG TAT</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-foreground">{formatDuration(metrics.medianHours)}</p>
            <p className="text-[10px] text-muted-foreground font-medium">MEDIAN</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-foreground">{metrics.slaPercentage}%</p>
            <p className="text-[10px] text-muted-foreground font-medium">WITHIN SLA</p>
          </div>
        </div>

        {/* Distribution Bars */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Distribution
          </p>
          {metrics.breakdown.map((b) => (
            <div key={b.label} className="flex items-center gap-2">
              <span className="text-[10px] w-12 text-muted-foreground font-mono">{b.label}</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    b.label === "> 48h"
                      ? "bg-red-500/70"
                      : b.label === "24-48h"
                      ? "bg-amber-500/70"
                      : "bg-teal-500/70"
                  }`}
                  style={{ width: `${Math.max(b.percentage, 2)}%` }}
                />
              </div>
              <span className="text-[10px] w-8 text-right text-muted-foreground">{b.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}