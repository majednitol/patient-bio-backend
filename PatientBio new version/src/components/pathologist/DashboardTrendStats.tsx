import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { FileText, Inbox, CheckCircle, Send, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { subDays, isAfter, parseISO } from "date-fns";
import type { PathologistReport } from "@/hooks/usePathologistReports";
import type { DoctorPathologistShare } from "@/hooks/useDoctorPathologistShares";

interface TrendStatsProps {
  reports: PathologistReport[];
  receivedShares: DoctorPathologistShare[];
  pendingCount: number;
}

function computeTrend(current: number, previous: number) {
  const diff = current - previous;
  if (diff === 0) return null;
  return { value: Math.abs(diff), positive: diff > 0 };
}

export function DashboardTrendStats({ reports, receivedShares, pendingCount }: TrendStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = subDays(now, 7);
    const twoWeeksAgo = subDays(now, 14);

    // Reports this week vs last week
    const reportsThisWeek = reports.filter((r) => isAfter(parseISO(r.created_at), oneWeekAgo)).length;
    const reportsLastWeek = reports.filter(
      (r) => isAfter(parseISO(r.created_at), twoWeeksAgo) && !isAfter(parseISO(r.created_at), oneWeekAgo)
    ).length;

    // Completed this week vs last week
    const completedThisWeek = receivedShares.filter(
      (s) => s.status === "completed" && s.completed_at && isAfter(parseISO(s.completed_at), oneWeekAgo)
    ).length;
    const completedLastWeek = receivedShares.filter(
      (s) =>
        s.status === "completed" &&
        s.completed_at &&
        isAfter(parseISO(s.completed_at), twoWeeksAgo) &&
        !isAfter(parseISO(s.completed_at), oneWeekAgo)
    ).length;

    // Shared reports
    const sharedCount = reports.filter((r) => r.is_shared_with_doctor || r.is_shared_with_patient).length;

    return [
      {
        title: "Total Reports",
        value: reports.length,
        icon: FileText,
        color: "text-teal-600 dark:text-teal-400",
        bgColor: "bg-teal-50 dark:bg-teal-900/20",
        description: "Reports created",
        link: "/pathologist/reports",
        trend: computeTrend(reportsThisWeek, reportsLastWeek),
      },
      {
        title: "Patients Waiting",
        value: pendingCount,
        icon: Inbox,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
        description: "Awaiting your care",
        link: "/pathologist/from-doctors",
        trend: null,
      },
      {
        title: "Completed",
        value: receivedShares.filter((s) => s.status === "completed").length,
        icon: CheckCircle,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        description: "Successfully delivered",
        link: "/pathologist/from-doctors",
        trend: computeTrend(completedThisWeek, completedLastWeek),
      },
      {
        title: "Shared Reports",
        value: sharedCount,
        icon: Send,
        color: "text-cyan-600 dark:text-cyan-400",
        bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
        description: "Helping patients",
        link: "/pathologist/to-doctors",
        trend: null,
      },
    ];
  }, [reports, receivedShares, pendingCount]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Link key={stat.title} to={stat.link}>
          <Card className="diagnostic-stat-card hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
                  {stat.trend && (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0.5 mt-1.5 inline-flex gap-0.5 ${
                        stat.trend.positive
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {stat.trend.positive ? (
                        <TrendingUp className="h-2.5 w-2.5" />
                      ) : (
                        <TrendingDown className="h-2.5 w-2.5" />
                      )}
                      {stat.trend.value} vs last week
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
