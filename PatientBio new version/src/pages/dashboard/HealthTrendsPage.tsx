import { useState, useRef } from "react";
import { Sparkline } from "@/components/ui/Sparkline";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useHealthMetrics, METRIC_TYPES } from "@/hooks/useHealthMetrics";
import { useHealthInsights } from "@/hooks/useHealthInsights";
import { AddMetricDialog } from "@/components/dashboard/AddMetricDialog";
import { HealthInsightsCard } from "@/components/dashboard/HealthInsightsCard";
import { MedicationRemindersCard } from "@/components/dashboard/MedicationRemindersCard";
import { MedicationCheckerDialog } from "@/components/dashboard/MedicationCheckerDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Calendar,
  AlertTriangle,
  Pill,
  Brain,
  Maximize2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const HealthTrendsPage = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [selectedMetric, setSelectedMetric] = useState("weight");
  const [timeRange, setTimeRange] = useState(30);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { metrics, latestMetrics, isLoading, calculateTrend } = useHealthMetrics(
    undefined,
    timeRange
  );
  const { anomalies, trends } = useHealthInsights();

  const selectedMetricDef = METRIC_TYPES.find((m) => m.type === selectedMetric);

  // Filter metrics for the selected type
  const chartData = metrics
    .filter((m) => m.metric_type === selectedMetric)
    .map((m) => ({
      date: format(new Date(m.measured_at), "MMM d"),
      value: Number(m.value),
      fullDate: format(new Date(m.measured_at), "MMM d, yyyy h:mm a"),
    }));

  const trend = calculateTrend(selectedMetric);

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-secondary" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendBadge = () => {
    if (!trend) return null;
    const color =
      trend.direction === "up"
        ? "bg-secondary/10 text-secondary"
        : trend.direction === "down"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";

    return (
      <Badge className={color}>
        {getTrendIcon()}
        <span className="ml-1">
          {trend.direction === "stable"
            ? "Stable"
            : `${trend.percentage.toFixed(1)}%`}
        </span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="bg-primary/10 p-1.5 sm:p-2 rounded-lg shrink-0">
            <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">{t("trendsPage.healthTrends")}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              {t("trendsPage.trackAndVisualize")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <MedicationCheckerDialog
            trigger={
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 sm:gap-2">
                <Pill className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">{t("trendsPage.checkInteractions")}</span>
              </Button>
            }
          />
          <AddMetricDialog
            trigger={
              <Button size="sm" className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3">
                <Plus className="h-3.5 w-3.5" />
                {t("trendsPage.addReading", "Add Reading")}
              </Button>
            }
          />
        </div>
      </div>

      {/* Anomaly Alerts (Phase 5.2 Enhancement) */}
      {anomalies.length > 0 && (
        <div className="space-y-2">
          {anomalies.map((anomaly) => {
            const metricDef = METRIC_TYPES.find(m => m.type === anomaly.metricType);
            return (
              <Alert key={anomaly.metricType} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center gap-2">
                  <span>{metricDef?.icon}</span>
                  {t("trendsPage.unusual")} {metricDef?.label || anomaly.metricType} {t("trendsPage.reading")}
                </AlertTitle>
                <AlertDescription>
                  {anomaly.anomalyDescription}
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {/* Desktop Two-Column Layout */}
      <div className="desktop-sidebar">
        {/* Main Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* AI Trend Summary Card (Phase 5.2 Enhancement) */}
          {trends.length >= 2 && (
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 dark:border-primary/30 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Brain className="h-5 w-5 text-primary" />
                  {t("trendsPage.aiTrendAnalysis")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {trends.slice(0, 4).map((t) => {
                    const metricDef = METRIC_TYPES.find(m => m.type === t.metricType);
                    return (
                      <div
                        key={t.metricType}
                        className="bg-background/80 dark:bg-card dark:border dark:border-border/60 rounded-lg p-3 cursor-pointer hover:bg-background transition-colors"
                        onClick={() => setSelectedMetric(t.metricType)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{metricDef?.icon || '📊'}</span>
                          {t.direction === 'up' && <TrendingUp className="h-3 w-3 text-secondary" />}
                          {t.direction === 'down' && <TrendingDown className="h-3 w-3 text-destructive" />}
                          {t.direction === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{metricDef?.label}</p>
                        <p className="text-sm font-semibold">
                          {t.percentageChange > 0 ? '+' : ''}{t.percentageChange.toFixed(1)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chart - Enhanced height on desktop */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-xl">{selectedMetricDef?.icon}</span>
                      {selectedMetricDef?.label || "Select Metric"}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4" />
                      {t("trendsPage.lastDays", { count: timeRange })}
                      {getTrendBadge()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    {chartData.length > 0 && isMobile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsFullscreen(true)}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Mobile: Horizontal swipe tabs for metrics */}
                {isMobile ? (
                  <div className="relative -mx-4">
                    <div
                      ref={scrollContainerRef}
                      className="overflow-x-auto px-4 hide-scrollbar"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                    >
                      <div className="flex gap-1.5 pb-1 pr-6">
                        {METRIC_TYPES.map((m) => (
                          <button
                            key={m.type}
                            onClick={() => setSelectedMetric(m.type)}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 press-feedback",
                              selectedMetric === m.type
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <span className="text-sm">{m.icon}</span>
                            {m.label.replace(/ \(.*\)/, "")}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Fade hint for more content */}
                    <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none" />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select
                      value={selectedMetric}
                      onValueChange={setSelectedMetric}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Metric" />
                      </SelectTrigger>
                      <SelectContent>
                        {METRIC_TYPES.map((m) => (
                          <SelectItem key={m.type} value={m.type}>
                            {m.icon} {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={timeRange.toString()}
                      onValueChange={(v) => setTimeRange(parseInt(v))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">{t("trendsPage.days7")}</SelectItem>
                        <SelectItem value="30">{t("trendsPage.days30")}</SelectItem>
                        <SelectItem value="90">{t("trendsPage.days90")}</SelectItem>
                        <SelectItem value="365">{t("trendsPage.year1")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Mobile: Time range pills */}
                {isMobile && (
                  <div className="flex gap-1.5">
                    {[
                      { value: 7, label: "7D" },
                      { value: 30, label: "30D" },
                      { value: 90, label: "90D" },
                      { value: 365, label: "1Y" },
                    ].map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setTimeRange(r.value)}
                        className={cn(
                          "px-3 py-1 rounded-md text-xs font-medium transition-all press-feedback",
                          timeRange === r.value
                            ? "bg-primary/10 text-primary border border-primary/30"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                   <h3 className="font-semibold mb-2">{t("trendsPage.noDataYet")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("trendsPage.startTracking", { metric: selectedMetricDef?.label.toLowerCase() })}
                  </p>
                  <AddMetricDialog
                    trigger={
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("trendsPage.addFirstReading")}
                      </Button>
                    }
                    defaultMetricType={selectedMetric}
                  />
                </div>
              ) : (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
                        interval={isMobile ? "preserveStartEnd" : 0}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
                        domain={["auto", "auto"]}
                        width={isMobile ? 35 : 45}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: isMobile ? "12px" : "14px",
                        }}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.fullDate || ""
                        }
                        formatter={(value: number) => [
                          `${value.toFixed(1)} ${selectedMetricDef?.unit}`,
                          selectedMetricDef?.label,
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                        activeDot={{
                          r: isMobile ? 6 : 4,
                          strokeWidth: 2,
                          fill: "hsl(var(--primary))",
                          stroke: "hsl(var(--background))",
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Full-screen chart overlay (mobile) */}
          <AnimatePresence>
            {isFullscreen && chartData.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] bg-background flex flex-col lg:hidden"
              >
                <div className="flex items-center justify-between p-3 border-b border-border dark:border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{selectedMetricDef?.icon}</span>
                    <span className="font-semibold text-sm">{selectedMetricDef?.label}</span>
                    {getTrendBadge()}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullscreen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex-1 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValueFS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} domain={["auto", "auto"]} width={40} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ""}
                        formatter={(value: number) => [`${value.toFixed(1)} ${selectedMetricDef?.unit}`, selectedMetricDef?.label]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorValueFS)"
                        activeDot={{ r: 7, strokeWidth: 2, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* All Metrics Grid - Expanded on desktop */}
          <Card>
            <CardHeader>
              <CardTitle>{t("trendsPage.allTrackedMetrics")}</CardTitle>
              <CardDescription>
                {t("trendsPage.clickToViewTrend")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {METRIC_TYPES.map((metricDef) => {
                  const latest = latestMetrics[metricDef.type];
                  const hasData = !!latest;

                  return (
                    <button
                      key={metricDef.type}
                      className={`p-3 rounded-lg border text-left transition-all hover:shadow-sm dark:border-border/60 dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.3)] ${
                        selectedMetric === metricDef.type
                          ? "bg-primary/5 border-primary"
                          : hasData
                          ? "bg-card hover:bg-muted/50"
                          : "bg-muted/30 opacity-60"
                      }`}
                      onClick={() => setSelectedMetric(metricDef.type)}
                    >
                      <span className="text-xl block mb-1">{metricDef.icon}</span>
                      <p className="text-xs font-medium truncate">{metricDef.label}</p>
                      <p className="text-sm font-bold">
                        {latest ? `${Number(latest.value).toFixed(1)}` : "—"}
                        <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                          {metricDef.unit}
                        </span>
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Quick Stats & Insights */}
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Stats - Vertical on desktop sidebar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("trendsPage.quickStats")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {METRIC_TYPES.slice(0, 4).map((metricDef) => {
                const latest = latestMetrics[metricDef.type];
                const metricTrend = calculateTrend(metricDef.type);
                // Get last 7 data points for sparkline
                const sparkData = metrics
                  .filter((m) => m.metric_type === metricDef.type)
                  .slice(-7)
                  .map((m) => Number(m.value));

                return (
                  <div
                    key={metricDef.type}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm dark:border-border/60 ${
                      selectedMetric === metricDef.type
                        ? "ring-2 ring-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedMetric(metricDef.type)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{metricDef.icon}</span>
                        <span className="text-sm font-medium">{metricDef.label}</span>
                      </div>
                      {metricTrend && (
                        <span
                          className={`text-xs ${
                            metricTrend.direction === "up"
                              ? "text-secondary"
                              : metricTrend.direction === "down"
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {metricTrend.direction === "up" ? "↑" : metricTrend.direction === "down" ? "↓" : "→"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-end justify-between mt-1">
                      <p className="text-lg font-bold">
                        {latest ? `${Number(latest.value).toFixed(1)}` : "—"}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          {metricDef.unit}
                        </span>
                      </p>
                      {sparkData.length >= 2 && (
                        <Sparkline data={sparkData} width={56} height={20} />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* AI Health Insights */}
          <HealthInsightsCard />

          {/* Medication Reminders */}
          <MedicationRemindersCard />
        </div>
      </div>
    </div>
  );
};

export default HealthTrendsPage;
