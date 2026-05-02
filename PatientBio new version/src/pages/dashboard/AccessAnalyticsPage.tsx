import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { InlineEmptyState } from "@/components/ui/empty-state";
import { 
  BarChart3, 
  Eye, 
  Users, 
  MapPin, 
  Clock, 
  Activity,
  User,
  Globe,
  Link2,
  TrendingUp,
  Download,
  Search,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { useAccessAnalytics, DateRange } from "@/hooks/useAccessAnalytics";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import AccessLogDetailDialog from "@/components/dashboard/AccessLogDetailDialog";
import AuditTrailExport from "@/components/dashboard/AuditTrailExport";

import { AccessActivityFeed } from "@/components/dashboard/AccessActivityFeed";
import type { AccessLog } from "@/hooks/useAccessAnalytics";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(173, 58%, 39%)",
  "hsl(142, 52%, 45%)",
];

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
];

const AccessAnalyticsPage = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>("7");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"accessor" | "token">("accessor");
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { 
    analytics, 
    tokenAnalytics, 
    suspiciousActivities,
    isLoading, 
    hasAccessLogs, 
    exportToCSV,
    loadMore,
    hasMore,
  } = useAccessAnalytics({ dateRange, searchQuery });

  if (isLoading) {
    return <PageSkeleton />;
  }

  const totalViews = hasAccessLogs ? analytics.totalAccesses : tokenAnalytics.totalViews;
  const uniqueAccessors = hasAccessLogs ? analytics.uniqueAccessors : tokenAnalytics.linksViewed;

  // Generate chart data based on selected date range
  const chartData = (() => {
    const days = parseInt(dateRange) || 7;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayData = analytics.accessesByDay.find((d) => d.date === dateStr);
      data.push({
        date: format(date, days > 30 ? "MMM d" : "MMM d"),
        fullDate: dateStr,
        accesses: dayData?.count || 0,
      });
    }
    return data;
  })();

  const handleLogClick = (log: AccessLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
            <div className="p-2 md:p-2.5 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            {t("analyticsPage.accessAnalytics")}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            {t("analyticsPage.seeWhoAccessed")}
          </p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3">
        {/* Date Range Selector */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          {DATE_RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={dateRange === option.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setDateRange(option.value)}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("analyticsPage.searchAccessorLocation")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-2 sm:flex gap-2">
          <AuditTrailExport compact />
          <Button variant="outline" onClick={exportToCSV} className="text-xs sm:text-sm">
            <Download className="h-4 w-4 mr-1.5 sm:mr-2" />
            {t("analyticsPage.exportCSV")}
          </Button>
        </div>
      </div>

      {/* Suspicious Activity Alerts */}
      {suspiciousActivities.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-destructive">{t("analyticsPage.unusualActivity")}</h4>
                {suspiciousActivities.map((activity, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {activity.message}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop Two-Column Layout for Stats + Chart */}
      <div className="desktop-sidebar">
        {/* Main Content Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Stats Overview - Now horizontal on mobile, 2x2 on tablet+ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <Card>
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                    <Eye className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base sm:text-2xl font-bold">{totalViews}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{t("analyticsPage.totalViews")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                    <Users className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base sm:text-2xl font-bold">{uniqueAccessors}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{t("analyticsPage.uniqueViewers")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                    <Link2 className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base sm:text-2xl font-bold">{tokenAnalytics.activeLinks}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{t("analyticsPage.activeLinks")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base sm:text-2xl font-bold">
                      {chartData.reduce((sum, d) => sum + d.accesses, 0)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{t("analyticsPage.thisPeriod")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Access Trend Chart - Enhanced height on desktop */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {t("analyticsPage.accessTrend")}
              </CardTitle>
              <CardDescription>{t("analyticsPage.dataAccessOverPeriod")}</CardDescription>
            </CardHeader>
            <CardContent>
              {totalViews === 0 ? (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">{t("analyticsPage.noAccessDataYet")}</p>
                </div>
              ) : (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="accessGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }} 
                        tickLine={false}
                        axisLine={false}
                        interval={parseInt(dateRange) > 30 ? 6 : "preserveStartEnd"}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="accesses" 
                        stroke="hsl(var(--primary))" 
                        fill="url(#accessGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* View Toggle & Content */}
          <Tabs value={view} onValueChange={(v) => setView(v as "accessor" | "token")}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="accessor" className="flex-1 sm:flex-none">
                <User className="h-4 w-4 mr-2" />
                {t("analyticsPage.byAccessor")}
              </TabsTrigger>
              <TabsTrigger value="token" className="flex-1 sm:flex-none">
                <Link2 className="h-4 w-4 mr-2" />
                {t("analyticsPage.byTokenLink")}
              </TabsTrigger>
            </TabsList>

            {/* By Accessor View */}
            <TabsContent value="accessor" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Top Accessors */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      {t("analyticsPage.topViewers")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.accessesByAccessor.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        {t("analyticsPage.noAccessorData")}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.accessesByAccessor.map((accessor, i) => (
                          <div key={accessor.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                              >
                                {accessor.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{accessor.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {accessor.type}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">{accessor.count}x</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Access by Location */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      {t("analyticsPage.accessLocations")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.accessesByLocation.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        {t("analyticsPage.locationNotAvailable")}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.accessesByLocation.map((loc) => (
                          <div key={loc.location} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate">{loc.location}</span>
                            </div>
                            <Badge variant="outline">{loc.count}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* By Token View */}
            <TabsContent value="token" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    {t("analyticsPage.accessLinksPerformance")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tokenAnalytics.recentlyAccessed.length === 0 ? (
                    <InlineEmptyState
                      icon={Link2}
                      title={t("analyticsPage.noAccessedLinks")}
                      description={t("analyticsPage.shareLinksToSee")}
                    />
                  ) : (
                    <div className="space-y-3">
                      {tokenAnalytics.recentlyAccessed.map((token) => (
                        <div 
                          key={token.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {token.label || "Access Link"}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Created {formatDistanceToNow(new Date(token.created_at), { addSuffix: true })}
                              </span>
                              {token.accessed_at && (
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  Last accessed {formatDistanceToNow(new Date(token.accessed_at), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={token.is_revoked ? "destructive" : new Date(token.expires_at) < new Date() ? "secondary" : "default"}
                            >
                              {token.is_revoked ? "Revoked" : new Date(token.expires_at) < new Date() ? "Expired" : "Active"}
                            </Badge>
                            <Badge variant="outline" className="font-mono">
                              {token.access_count}x
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar: Activity Timeline */}
        <div className="space-y-4">
          <Card className="lg:sticky lg:top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {t("analyticsPage.accessTrend")}
              </CardTitle>
              <CardDescription className="text-xs">{t("common.view")}</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[500px] lg:max-h-[600px] overflow-y-auto">
              {analytics.recentLogs.length === 0 && tokenAnalytics.recentlyAccessed.length === 0 ? (
                <InlineEmptyState
                  icon={Activity}
                  title={t("analyticsPage.noAccessDataYet")}
                  description={t("analyticsPage.shareLinksToSee")}
                />
              ) : hasAccessLogs ? (
                <div className="space-y-4">
                  {analytics.recentLogs.map((log, i) => (
                    <div 
                      key={log.id} 
                      className="flex gap-3 cursor-pointer hover:bg-muted/30 -mx-2 px-2 py-1 rounded-lg transition-colors"
                      onClick={() => handleLogClick(log)}
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        {i < analytics.recentLogs.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-3 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {log.accessor_name || log.accessor_email || "Anonymous"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {log.access_reason || `Accessed via ${log.accessor_type}`}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {log.city && log.country && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {log.city}
                            </span>
                          )}
                          <span>{format(new Date(log.accessed_at), "MMM d, h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Load More Button */}
                  {hasMore && (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={loadMore}
                      size="sm"
                    >
                      <ChevronDown className="h-4 w-4 mr-2" />
                      {t("analyticsPage.loadMore")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {tokenAnalytics.recentlyAccessed.slice(0, 5).map((token) => (
                    <div key={token.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <Eye className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{token.label || "Access Link"}</p>
                          <p className="text-xs text-muted-foreground">
                            Viewed {token.access_count} time{token.access_count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {token.accessed_at && formatDistanceToNow(new Date(token.accessed_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Access Activity Feed Timeline */}
      <AccessActivityFeed />

      {/* Access Log Detail Dialog */}
      <AccessLogDetailDialog
        log={selectedLog}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
};

export default AccessAnalyticsPage;
