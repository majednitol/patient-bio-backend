import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePathologistReports } from "@/hooks/usePathologistReports";
import { useDoctorPathologistShares } from "@/hooks/useDoctorPathologistShares";
import { TestPopularityChart } from "@/components/pathologist/TestPopularityChart";
import { TATBreakdownChart } from "@/components/pathologist/TATBreakdownChart";
import { TATTrackerCard } from "@/components/pathologist/TATTrackerCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  Loader2,
  Activity,
  Heart,
  Microscope,
  Sparkles,
  Download,
  CalendarIcon,
  Banknote,
} from "lucide-react";
import { format, subDays, startOfDay, isAfter, parseISO, isBefore, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Healthcare-friendly teal/cyan color palette
const CHART_COLORS = [
  "hsl(173, 58%, 39%)",  // diagnostic-primary (teal)
  "hsl(187, 47%, 55%)",  // diagnostic-secondary (cyan)
  "hsl(142, 52%, 45%)",  // diagnostic-accent (green)
  "hsl(38, 92%, 50%)",   // amber
  "hsl(199, 89%, 48%)",  // blue
  "hsl(316, 70%, 58%)",  // pink
];

type RangePreset = "7d" | "30d" | "90d" | "custom";

const PathologistAnalyticsPage = () => {
  const { user } = useAuth();
  const { reports, isLoading: reportsLoading } = usePathologistReports();
  const { receivedShares, isLoading: sharesLoading } = useDoctorPathologistShares();

  const isLoading = reportsLoading || sharesLoading;

  const [selectedRange, setSelectedRange] = useState<RangePreset>("30d");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    if (selectedRange === "custom" && customStart && customEnd) {
      return { startDate: startOfDay(customStart), endDate: endOfDay(customEnd) };
    }
    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[selectedRange] || 30;
    return { startDate: startOfDay(subDays(now, days)), endDate: endOfDay(now) };
  }, [selectedRange, customStart, customEnd]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const d = parseISO(r.created_at);
      return !isBefore(d, startDate) && !isAfter(d, endDate);
    });
  }, [reports, startDate, endDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalReports = filteredReports.length;
    const sharedWithDoctors = filteredReports.filter((r) => r.is_shared_with_doctor).length;
    const sharedWithPatients = filteredReports.filter((r) => r.is_shared_with_patient).length;
    const pendingReferrals = receivedShares.filter((s) => s.status === "pending").length;
    const completedReferrals = receivedShares.filter((s) => s.status === "completed").length;

    const last7Days = subDays(new Date(), 7);
    const recentReports = filteredReports.filter((r) =>
      isAfter(parseISO(r.created_at), startOfDay(last7Days))
    ).length;

    return {
      totalReports,
      sharedWithDoctors,
      sharedWithPatients,
      pendingReferrals,
      completedReferrals,
      recentReports,
      totalReferrals: receivedShares.length,
    };
  }, [filteredReports, receivedShares]);

  // Reports by type chart data
  const reportsByType = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const type = r.report_type || "other";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    return Object.entries(typeCounts).map(([name, value]) => ({
      name: name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value,
    }));
  }, [filteredReports]);

  // Reports by disease category
  const reportsByCategory = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const category = r.disease_category || "general";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    return Object.entries(categoryCounts).map(([name, value]) => ({
      name: name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value,
    }));
  }, [filteredReports]);

  // Reports trend based on selected range
  const reportsTrend = useMemo(() => {
    const diffMs = endDate.getTime() - startDate.getTime();
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const trend = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const count = filteredReports.filter(
        (r) => format(parseISO(r.created_at), "yyyy-MM-dd") === dateStr
      ).length;
      trend.push({
        date: format(date, days > 30 ? "MMM dd" : "MMM dd"),
        reports: count,
      });
    }
    return trend;
  }, [filteredReports, startDate, endDate]);

  // Referral status distribution
  const referralStatus = useMemo(() => {
    const statusCounts: Record<string, number> = {
      pending: 0,
      viewed: 0,
      completed: 0,
    };
    receivedShares.forEach((s) => {
      const status = s.status || "pending";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [receivedShares]);

  // Revenue data from invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["pathologist-invoices-analytics", user?.id, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("pathologist_invoices")
        .select("total_amount, amount_paid, status, invoice_date, created_at")
        .eq("pathologist_id", user.id)
        .gte("invoice_date", format(startDate, "yyyy-MM-dd"))
        .lte("invoice_date", format(endDate, "yyyy-MM-dd"))
        .order("invoice_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const revenueStats = useMemo(() => {
    const totalBilled = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
    const totalCollected = invoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
    const totalPending = totalBilled - totalCollected;
    return { totalBilled, totalCollected, totalPending };
  }, [invoices]);

  const revenueTrend = useMemo(() => {
    if (invoices.length === 0) return [];
    const byDate: Record<string, { billed: number; collected: number }> = {};
    invoices.forEach((inv) => {
      const d = inv.invoice_date;
      if (!byDate[d]) byDate[d] = { billed: 0, collected: 0 };
      byDate[d].billed += inv.total_amount || 0;
      byDate[d].collected += inv.amount_paid || 0;
    });
    let cumBilled = 0;
    let cumCollected = 0;
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => {
        cumBilled += vals.billed;
        cumCollected += vals.collected;
        return {
          date: format(parseISO(date), "MMM dd"),
          billed: cumBilled,
          collected: cumCollected,
        };
      });
  }, [invoices]);

  const exportCSV = () => {
    const headers = ["Report Name", "Type", "Category", "Created At", "Shared With Doctor", "Shared With Patient"];
    const rows = filteredReports.map((r) => [
      r.report_name,
      r.report_type || "",
      r.disease_category || "",
      r.created_at,
      r.is_shared_with_doctor ? "Yes" : "No",
      r.is_shared_with_patient ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const daysLabel = selectedRange === "custom" 
    ? `${format(startDate, "MMM dd")} – ${format(endDate, "MMM dd")}`
    : selectedRange === "7d" ? "7 Days" : selectedRange === "30d" ? "30 Days" : "90 Days";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="p-4 rounded-2xl diagnostic-gradient">
          <Microscope className="h-8 w-8 text-white animate-pulse" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--diagnostic-primary))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl diagnostic-gradient">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground flex items-center gap-1">
              <Heart className="h-4 w-4" />
              Track your impact on patient care
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["7d", "30d", "90d"] as RangePreset[]).map((preset) => (
          <Button
            key={preset}
            size="sm"
            variant={selectedRange === preset ? "default" : "outline"}
            onClick={() => setSelectedRange(preset)}
            className={selectedRange === preset ? "diagnostic-gradient text-white" : ""}
          >
            {preset === "7d" ? "7 Days" : preset === "30d" ? "30 Days" : "90 Days"}
          </Button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant={selectedRange === "custom" ? "default" : "outline"}
              className={cn(selectedRange === "custom" && "diagnostic-gradient text-white")}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {selectedRange === "custom" && customStart && customEnd
                ? `${format(customStart, "MMM dd")} – ${format(customEnd, "MMM dd")}`
                : "Custom Range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={customStart && customEnd ? { from: customStart, to: customEnd } : undefined}
              onSelect={(range) => {
                if (range?.from) setCustomStart(range.from);
                if (range?.to) {
                  setCustomEnd(range.to);
                  setSelectedRange("custom");
                }
              }}
              numberOfMonths={2}
              disabled={(date) => date > new Date()}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Insight Banner */}
      {stats.recentReports > 0 && (
        <Card className="diagnostic-gradient-soft border-[hsl(var(--diagnostic-primary)/0.2)]">
          <CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
            <p className="text-sm font-medium">
              Great work! You've created <span className="text-[hsl(var(--diagnostic-primary))] font-bold">{stats.recentReports} reports</span> in the last 7 days, helping patients on their health journey.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="diagnostic-stat-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[hsl(var(--diagnostic-primary)/0.1)]">
                <FileText className="h-6 w-6 text-[hsl(var(--diagnostic-primary))]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{stats.totalReports}</p>
                <p className="text-xs text-muted-foreground">In selected period</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="diagnostic-stat-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[hsl(var(--diagnostic-secondary)/0.1)]">
                <TrendingUp className="h-6 w-6 text-[hsl(var(--diagnostic-secondary))]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last 7 Days</p>
                <p className="text-2xl font-bold">{stats.recentReports}</p>
                <p className="text-xs text-muted-foreground">Recent activity</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="diagnostic-stat-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Patients Waiting</p>
                <p className="text-2xl font-bold">{stats.pendingReferrals}</p>
                <p className="text-xs text-muted-foreground">Awaiting your care</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="diagnostic-stat-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[hsl(var(--diagnostic-accent)/0.1)]">
                <CheckCircle className="h-6 w-6 text-[hsl(var(--diagnostic-accent))]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completedReferrals}</p>
                <p className="text-xs text-muted-foreground">Successfully delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Section */}
      {invoices.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="diagnostic-stat-card">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-[hsl(var(--diagnostic-primary)/0.1)]">
                    <Banknote className="h-6 w-6 text-[hsl(var(--diagnostic-primary))]" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Billed</p>
                    <p className="text-2xl font-bold">৳{revenueStats.totalBilled.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="diagnostic-stat-card">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-[hsl(var(--diagnostic-accent)/0.1)]">
                    <CheckCircle className="h-6 w-6 text-[hsl(var(--diagnostic-accent))]" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Collected</p>
                    <p className="text-2xl font-bold text-[hsl(var(--diagnostic-accent))]">৳{revenueStats.totalCollected.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="diagnostic-stat-card">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-amber-600">৳{revenueStats.totalPending.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {revenueTrend.length > 1 && (
            <Card className="diagnostic-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
                  Revenue Trend ({daysLabel})
                </CardTitle>
                <CardDescription>Cumulative billed vs collected</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area type="monotone" dataKey="billed" stroke="hsl(173, 58%, 39%)" fill="hsl(173, 58%, 39%)" fillOpacity={0.1} strokeWidth={2} name="Billed" />
                    <Area type="monotone" dataKey="collected" stroke="hsl(142, 52%, 45%)" fill="hsl(142, 52%, 45%)" fillOpacity={0.2} strokeWidth={2} name="Collected" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports Trend Line Chart */}
        <Card className="diagnostic-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
              Reports Trend ({daysLabel})
            </CardTitle>
            <CardDescription>Your contribution to patient care over time</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={reportsTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                    interval={reportsTrend.length > 30 ? Math.floor(reportsTrend.length / 10) : undefined}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="reports"
                    stroke="hsl(173, 58%, 39%)"
                    strokeWidth={2}
                    dot={reportsTrend.length <= 30 ? { fill: "hsl(173, 58%, 39%)" } : false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reports by Type Bar Chart */}
        <Card className="diagnostic-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
              Reports by Type
            </CardTitle>
            <CardDescription>Distribution of report types</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={reportsByType}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No reports yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disease Category Pie Chart */}
        <Card className="diagnostic-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
              Reports by Disease Category
            </CardTitle>
            <CardDescription>Breakdown by diagnostic category</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsByCategory.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie
                      data={reportsByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {reportsByCategory.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {reportsByCategory.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      <span className="text-sm text-muted-foreground flex-1">
                        {entry.name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {entry.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No reports yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral Status Distribution */}
        <Card className="diagnostic-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
              Referral Status
            </CardTitle>
            <CardDescription>Status of referrals from doctors</CardDescription>
          </CardHeader>
          <CardContent>
            {referralStatus.some((s) => s.value > 0) ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie
                      data={referralStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {referralStatus.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {referralStatus.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      <span className="text-sm text-muted-foreground flex-1">
                        {entry.name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {entry.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No referrals yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Popularity & TAT Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TestPopularityChart reports={filteredReports} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TATTrackerCard />
        <TATBreakdownChart reports={filteredReports} />
      </div>

      {/* Summary Stats */}
      <Card className="diagnostic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
            Your Impact Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[hsl(var(--diagnostic-primary)/0.08)] text-center border border-[hsl(var(--diagnostic-primary)/0.1)]">
              <p className="text-2xl font-bold text-[hsl(var(--diagnostic-primary))]">{stats.sharedWithDoctors}</p>
              <p className="text-sm text-muted-foreground">Shared with Doctors</p>
            </div>
            <div className="p-4 rounded-xl bg-[hsl(var(--diagnostic-secondary)/0.08)] text-center border border-[hsl(var(--diagnostic-secondary)/0.1)]">
              <p className="text-2xl font-bold text-[hsl(var(--diagnostic-secondary))]">{stats.sharedWithPatients}</p>
              <p className="text-sm text-muted-foreground">Shared with Patients</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-center border border-amber-200/50 dark:border-amber-800/30">
              <p className="text-2xl font-bold text-amber-600">{stats.totalReferrals}</p>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </div>
            <div className="p-4 rounded-xl bg-[hsl(var(--diagnostic-accent)/0.08)] text-center border border-[hsl(var(--diagnostic-accent)/0.1)]">
              <p className="text-2xl font-bold text-[hsl(var(--diagnostic-accent))]">
                {stats.totalReports > 0
                  ? Math.round((stats.sharedWithDoctors / stats.totalReports) * 100)
                  : 0}
                %
              </p>
              <p className="text-sm text-muted-foreground">Share Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PathologistAnalyticsPage;
