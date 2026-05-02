import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog, Mail, TrendingUp, TrendingDown, Users, Activity, Share2, Stethoscope, Shield, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PlatformCompletionCard } from "@/components/admin/PlatformCompletionCard";
import { WebsiteTrafficCard } from "@/components/admin/WebsiteTrafficCard";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/ui/Sparkline";
import { GlobalPoolSummaryCard } from "@/components/admin/GlobalPoolSummaryCard";
import { ConsentComplianceCard } from "@/components/admin/ConsentComplianceCard";
import { DateRangeFilter, useDateRangeFilter } from "@/components/admin/DateRangeFilter";
import { useAdminAnalyticsExport } from "@/hooks/useAdminAnalyticsExport";
import { Button } from "@/components/ui/button";

interface ContactMessage {
  id: string;
  status: string;
  created_at: string;
}

interface UserSignup {
  created_at: string;
  email_confirmed_at: string | null;
}

function StatCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ className = "" }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="p-3 sm:p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <Skeleton className="h-[200px] sm:h-[250px] w-full" />
      </CardContent>
    </Card>
  );
}

const ROLE_COLORS = {
  Patient: "hsl(var(--chart-1))",
  Doctor: "hsl(var(--chart-2))",
  Pathologist: "hsl(var(--chart-3))",
  Researcher: "hsl(var(--chart-4))",
  Hospital: "hsl(var(--chart-5))",
};

const DISEASE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];

const STAT_CARD_STYLES = [
  { bg: "bg-primary/10", iconBg: "bg-primary/20", iconColor: "text-primary" },
  { bg: "bg-secondary/10", iconBg: "bg-secondary/20", iconColor: "text-secondary-foreground" },
  { bg: "bg-accent/10", iconBg: "bg-accent/20", iconColor: "text-accent-foreground" },
  { bg: "bg-primary/10", iconBg: "bg-primary/20", iconColor: "text-primary" },
];

export default function Dashboard() {
  const { dateRange, setDateRange } = useDateRangeFilter("30d");
  const { exportCSV, exportPDF, isExporting } = useAdminAnalyticsExport();
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["admin-messages-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("id, status, created_at")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ContactMessage[];
    },
  });

  const { data: teamCount, isLoading: teamLoading } = useQuery({
    queryKey: ["admin-team-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("team_members")
        .select("id", { count: "exact", head: true });

      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: userStats, isLoading: userStatsLoading } = useQuery({
    queryKey: ["admin-user-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users?action=stats", {
        method: "GET",
      });

      if (error) throw error;
      return data as { signups: UserSignup[]; totalUsers: number };
    },
  });

  // Fetch user role distribution
  const { data: roleDistribution, isLoading: rolesLoading } = useQuery({
    queryKey: ["admin-role-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .limit(1000);

      if (error) throw error;

      const roleCounts: Record<string, number> = {
        Patient: 0,
        Doctor: 0,
        Pathologist: 0,
        Researcher: 0,
        Hospital: 0,
      };

      data?.forEach((r) => {
        switch (r.role) {
          case "user":
            roleCounts.Patient++;
            break;
          case "doctor":
            roleCounts.Doctor++;
            break;
          case "pathologist":
            roleCounts.Pathologist++;
            break;
          case "researcher":
            roleCounts.Researcher++;
            break;
          case "hospital_admin":
            roleCounts.Hospital++;
            break;
        }
      });

      return Object.entries(roleCounts)
        .map(([name, value]) => ({ name, value }))
        .filter((r) => r.value > 0);
    },
  });

  // Fetch shared data statistics
  const { data: sharedDataStats, isLoading: sharedDataLoading } = useQuery({
    queryKey: ["admin-shared-data-stats"],
    queryFn: async () => {
      const [tokensRes, doctorSharesRes, researchSharesRes] = await Promise.all([
        supabase.from("access_tokens").select("id, created_at, is_revoked").limit(1000),
        supabase.from("doctor_pathologist_shares").select("id, status").limit(1000),
        supabase.from("doctor_researcher_shares").select("id, status").limit(1000),
      ]);

      const tokens = tokensRes.data || [];
      const doctorShares = doctorSharesRes.data || [];
      const researchShares = researchSharesRes.data || [];

      return {
        totalTokens: tokens.length,
        activeTokens: tokens.filter((t) => !t.is_revoked).length,
        pathologistShares: doctorShares.length,
        researcherShares: researchShares.length,
        pendingPathologist: doctorShares.filter((s) => s.status === "pending").length,
        pendingResearcher: researchShares.filter((s) => s.status === "pending").length,
      };
    },
  });

  // Fetch disease category distribution
  const { data: diseaseDistribution, isLoading: diseaseLoading } = useQuery({
    queryKey: ["admin-disease-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_records")
        .select("disease_category")
        .limit(1000);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((r) => {
        const category = r.disease_category || "general";
        counts[category] = (counts[category] || 0) + 1;
      });

      const categoryLabels: Record<string, string> = {
        general: "General",
        cancer: "Cancer",
        covid19: "COVID-19",
        diabetes: "Diabetes",
        heart_disease: "Heart Disease",
        other: "Other",
      };

      return Object.entries(counts).map(([key, value]) => ({
        name: categoryLabels[key] || key,
        value,
      }));
    },
  });

  const isLoading = messagesLoading || teamLoading || userStatsLoading || rolesLoading || sharedDataLoading || diseaseLoading;

  const stats = useMemo(() => {
    if (!messages) return { total: 0, unread: 0, thisWeek: 0 };
    
    const now = new Date();
    const weekAgo = subDays(now, 7);
    
    return {
      total: messages.length,
      unread: messages.filter(m => m.status === "new").length,
      thisWeek: messages.filter(m => new Date(m.created_at) >= weekAgo).length,
    };
  }, [messages]);

  const userStatsCalc = useMemo(() => {
    if (!userStats?.signups) return { total: 0, thisWeek: 0, verified: 0 };
    
    const now = new Date();
    const weekAgo = subDays(now, 7);
    
    return {
      total: userStats.totalUsers,
      thisWeek: userStats.signups.filter(u => new Date(u.created_at) >= weekAgo).length,
      verified: userStats.signups.filter(u => u.email_confirmed_at).length,
    };
  }, [userStats]);

  const messagesByDay = useMemo(() => {
    if (!messages) return [];
    
    const now = new Date();
    const startDate = subDays(now, 29);
    const days = eachDayOfInterval({ start: startDate, end: now });
    
    const countsByDay = new Map<string, number>();
    messages.forEach(msg => {
      const day = format(startOfDay(new Date(msg.created_at)), "yyyy-MM-dd");
      countsByDay.set(day, (countsByDay.get(day) || 0) + 1);
    });
    
    return days.map(day => ({
      date: format(day, "MMM d"),
      fullDate: format(day, "yyyy-MM-dd"),
      messages: countsByDay.get(format(day, "yyyy-MM-dd")) || 0,
    }));
  }, [messages]);

  const signupsByDay = useMemo(() => {
    if (!userStats?.signups) return [];
    
    const now = new Date();
    const startDate = subDays(now, 29);
    const days = eachDayOfInterval({ start: startDate, end: now });
    
    const countsByDay = new Map<string, number>();
    let cumulative = 0;
    
    userStats.signups.forEach(user => {
      const userDate = new Date(user.created_at);
      if (userDate < startDate) {
        cumulative++;
      }
    });
    
    userStats.signups.forEach(user => {
      const day = format(startOfDay(new Date(user.created_at)), "yyyy-MM-dd");
      countsByDay.set(day, (countsByDay.get(day) || 0) + 1);
    });
    
    return days.map(day => {
      const dayKey = format(day, "yyyy-MM-dd");
      const signups = countsByDay.get(dayKey) || 0;
      cumulative += signups;
      return {
        date: format(day, "MMM d"),
        fullDate: dayKey,
        signups,
        total: cumulative,
      };
    });
  }, [userStats]);

  // Compute sparkline data (last 7 days of signups)
  const sparklineData = useMemo(() => {
    if (!userStats?.signups) return [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
    const countsByDay = new Map<string, number>();
    userStats.signups.forEach((u) => {
      const day = format(startOfDay(new Date(u.created_at)), "yyyy-MM-dd");
      countsByDay.set(day, (countsByDay.get(day) || 0) + 1);
    });
    return days.map((d) => countsByDay.get(format(d, "yyyy-MM-dd")) || 0);
  }, [userStats]);

  // Week-over-week trend for signups
  const signupTrend = useMemo(() => {
    if (!userStats?.signups) return 0;
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const twoWeeksAgo = subDays(now, 14);
    const thisWeek = userStats.signups.filter((u) => new Date(u.created_at) >= weekAgo).length;
    const lastWeek = userStats.signups.filter((u) => {
      const d = new Date(u.created_at);
      return d >= twoWeeksAgo && d < weekAgo;
    }).length;
    return lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek > 0 ? 100 : 0;
  }, [userStats]);

  const statCards = [
    {
      title: "Total Users",
      value: userStatsCalc.total,
      description: `${userStatsCalc.verified} verified`,
      icon: Users,
      sparkline: sparklineData,
      trend: signupTrend,
    },
    {
      title: "Team Members",
      value: teamCount ?? 0,
      description: "Active members",
      icon: UserCog,
    },
    {
      title: "Data Shares",
      value: (sharedDataStats?.totalTokens || 0) + (sharedDataStats?.pathologistShares || 0) + (sharedDataStats?.researcherShares || 0),
      description: `${sharedDataStats?.activeTokens || 0} active`,
      icon: Share2,
    },
    {
      title: "New This Week",
      value: userStatsCalc.thisWeek,
      description: "Signups",
      icon: TrendingUp,
      trend: signupTrend,
    },
  ];

  const chartConfig = {
    messages: { label: "Messages", color: "hsl(var(--primary))" },
    signups: { label: "Signups", color: "hsl(var(--chart-2))" },
    total: { label: "Total Users", color: "hsl(var(--chart-3))" },
  };

  const handleExportDashboard = () => {
    exportCSV({
      title: "Admin Dashboard Summary",
      headers: ["Metric", "Value", "Detail"],
      rows: statCards.map((s) => [s.title, String(s.value), s.description]),
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-300">
      {/* Welcome Banner */}
      <Card className="overflow-hidden border shadow-sm">
        <div className="bg-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">Admin Dashboard</h1>
                <p className="text-muted-foreground text-xs sm:text-sm">Platform analytics and overview</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExportDashboard} disabled={isExporting}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
              <Badge variant="secondary" className="w-fit text-[10px] sm:text-xs">
                {userStatsCalc.total} users
              </Badge>
              {stats.unread > 0 && (
                <Badge variant="destructive" className="w-fit text-[10px] sm:text-xs">
                  {stats.unread} unread
                </Badge>
              )}
            </div>
          </div>
          <div className="mt-3">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </>
      ) : (
        <>
          {/* Stat Cards - Enhanced with icon backgrounds */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, index) => {
              const style = STAT_CARD_STYLES[index];
              return (
                <Card key={stat.title} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className={cn("p-2 sm:p-2.5 rounded-xl flex-shrink-0", style.iconBg)}>
                        <stat.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", style.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.title}</p>
                          {stat.trend !== undefined && (
                            <span className={cn(
                              "inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-medium px-1 py-0.5 rounded",
                              stat.trend >= 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            )}>
                              {stat.trend >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                              {stat.trend >= 0 ? "+" : ""}{stat.trend}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg sm:text-2xl font-bold leading-tight">{stat.value}</p>
                          {stat.sparkline && <Sparkline data={stat.sparkline} width={48} height={18} className="hidden sm:block" />}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* User Distribution & Data Sharing Stats */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Pie Chart */}
            <Card>
              <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  User Distribution
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-sm">By account type</CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-0 sm:p-6 sm:pt-0">
                {roleDistribution && roleDistribution.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={roleDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                          labelLine={false}
                        >
                          {roleDistribution.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={ROLE_COLORS[entry.name as keyof typeof ROLE_COLORS] || "hsl(var(--muted))"} 
                            />
                          ))}
                        </Pie>
                        <Legend 
                          wrapperStyle={{ fontSize: '11px' }}
                          iconSize={8}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-[200px] sm:h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                    No user role data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Sharing Overview */}
            <Card>
              <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Data Sharing
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-sm">Patient data activity</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-2.5 sm:space-y-3">
                  {[
                    { label: "Access Tokens", sub: "Patient share links", value: sharedDataStats?.totalTokens || 0, detail: `${sharedDataStats?.activeTokens || 0} active` },
                    { label: "Pathologist", sub: "Doctor shares", value: sharedDataStats?.pathologistShares || 0, detail: `${sharedDataStats?.pendingPathologist || 0} pending` },
                    { label: "Research", sub: "Doctor shares", value: sharedDataStats?.researcherShares || 0, detail: `${sharedDataStats?.pendingResearcher || 0} pending` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-2.5 sm:p-3 bg-muted/50 rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm truncate">{item.label}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{item.sub}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-lg sm:text-2xl font-bold">{item.value}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Completion Health */}
          <PlatformCompletionCard />

          {/* Website Traffic Analytics */}
          <WebsiteTrafficCard />

          {/* Global Data Pool + Consent & Compliance */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
            <GlobalPoolSummaryCard />
            <ConsentComplianceCard />
          </div>

          {/* Disease Distribution & User Signups */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Disease Categories
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-sm">Health records by category</CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-0 sm:p-6 sm:pt-0">
                {diseaseDistribution && diseaseDistribution.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={diseaseDistribution} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          tick={{ fontSize: 10 }} 
                          tickLine={false}
                          axisLine={false}
                          width={75}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" name="Records" radius={[0, 4, 4, 0]}>
                          {diseaseDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={DISEASE_COLORS[index % DISEASE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-[200px] sm:h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                    No health records data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  User Signups
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-sm">Last 30 days</CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-0 sm:p-6 sm:pt-0">
                <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={signupsByDay} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }} 
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        width={30}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="signups" 
                        fill="hsl(var(--chart-2))" 
                        radius={[4, 4, 0, 0]}
                        name="Signups"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Activity Feed + Message Analytics */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
            <ActivityFeed />
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Message Volume
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-sm">Last 30 days</CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-0 sm:p-6 sm:pt-0">
                <ChartContainer config={chartConfig} className="h-[180px] sm:h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={messagesByDay} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }} 
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        width={30}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="messages"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorMessages)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Platform Activity
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-sm">Quick summary</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-0">
                  {[
                    { label: "Messages", value: stats.total, color: "" },
                    { label: "Unread", value: stats.unread, color: stats.unread > 0 ? "text-destructive" : "" },
                    { label: "This Week", value: stats.thisWeek, color: "" },
                    { label: "Team Size", value: teamCount, color: "" },
                  ].map((item, i) => (
                    <div 
                      key={item.label} 
                      className={cn(
                        "flex items-center justify-between py-2 sm:py-2.5 px-2 sm:px-0 bg-muted/30 sm:bg-transparent rounded-lg sm:rounded-none",
                        i < 3 && "sm:border-b"
                      )}
                    >
                      <span className="text-xs sm:text-sm text-muted-foreground">{item.label}</span>
                      <span className={cn("font-semibold text-sm sm:text-base", item.color)}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
