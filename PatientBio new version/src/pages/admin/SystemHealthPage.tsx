import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Database,
  Zap,
  Server,
  RefreshCw,
  FileText,
  Download,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subDays, formatDistanceToNow } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import HealthStatusCards from "@/components/admin/health/HealthStatusCards";
import ApiLatencyCard from "@/components/admin/health/ApiLatencyCard";
import ErrorRatesCard from "@/components/admin/health/ErrorRatesCard";
import ActiveUsersCard from "@/components/admin/health/ActiveUsersCard";
import StorageUsageCard from "@/components/admin/health/StorageUsageCard";
import BlockchainIntegrityCard from "@/components/admin/health/BlockchainIntegrityCard";
import AuditTrailIntegrityCard from "@/components/admin/health/AuditTrailIntegrityCard";
import ParallelVerificationCard from "@/components/admin/health/ParallelVerificationCard";
import ChainBreakAlertBanner from "@/components/admin/health/ChainBreakAlertBanner";
import CrossChainConsistencyCard from "@/components/admin/health/CrossChainConsistencyCard";
import EdgeFunctionPerfCard from "@/components/admin/health/EdgeFunctionPerfCard";
import DatabaseGrowthCard from "@/components/admin/health/DatabaseGrowthCard";
import { EngagementTrendsCard } from "@/components/admin/EngagementTrendsCard";
import WarningsSummaryBanner from "@/components/admin/health/WarningsSummaryBanner";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo, useState } from "react";
import {
  latencySeverity,
  integritySeverity,
  crossChainSeverity,
  RECOMMENDATIONS,
  type HealthWarning,
} from "@/utils/healthSeverity";

interface LatencyResult {
  endpoint: string;
  latencyMs: number;
  status: "fast" | "normal" | "slow";
}

export default function SystemHealthPage() {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);

  // Lift API latency query to derive live performance status
  const { data: apiLatencyData, dataUpdatedAt: latencyUpdatedAt } = useQuery({
    queryKey: ["admin-api-latency"],
    queryFn: async (): Promise<LatencyResult[]> => {
      const endpoints = [
        { name: "user_profiles", table: "user_profiles" as const },
        { name: "health_records", table: "health_records" as const },
        { name: "appointments", table: "appointments" as const },
        { name: "prescriptions", table: "prescriptions" as const },
        { name: "access_logs", table: "access_logs" as const },
        { name: "notifications", table: "notifications" as const },
      ];
      const results = await Promise.all(
        endpoints.map(async (ep) => {
          const start = performance.now();
          await supabase.from(ep.table).select("id", { count: "exact", head: true });
          const elapsed = Math.round(performance.now() - start);
          return {
            endpoint: ep.name,
            latencyMs: elapsed,
            status: (elapsed < 200 ? "fast" : elapsed < 500 ? "normal" : "slow") as LatencyResult["status"],
          };
        })
      );
      return results.sort((a, b) => b.latencyMs - a.latencyMs);
    },
    staleTime: STALE_TIMES.ANALYTICS,
    refetchInterval: 120000,
  });

  // Live audit trail integrity
  const { data: auditIntegrity } = useQuery({
    queryKey: ["admin-audit-integrity"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_audit_trail_integrity");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        total: Number(row?.total_entries ?? 0),
        verified: Number(row?.verified_entries ?? 0),
        broken: Number(row?.broken_chain_count ?? 0),
        percentage: Number(row?.integrity_percentage ?? 100),
      };
    },
    staleTime: STALE_TIMES.ANALYTICS,
    refetchInterval: 300000,
  });

  // Blockchain integrity for PDF
  const { data: blockchainIntegrity } = useQuery({
    queryKey: ["admin-blockchain-integrity-pdf"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_blockchain_integrity");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { percentage: Number(row?.integrity_percentage ?? 100) };
    },
    staleTime: STALE_TIMES.ANALYTICS,
  });

  // Cross-chain consistency for PDF
  const { data: crossChainData } = useQuery({
    queryKey: ["admin-cross-chain-pdf"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_cross_chain_consistency");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { percentage: Number(row?.consistency_percentage ?? 100) };
    },
    staleTime: STALE_TIMES.ANALYTICS,
  });

  const { data: edgeFunctionStats, isLoading: edgeLoading, refetch: refetchEdge } = useQuery({
    queryKey: ["admin-edge-function-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_logs")
        .select("accessed_at")
        .gte("accessed_at", subDays(new Date(), 1).toISOString())
        .order("accessed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const { data: totalCount } = await supabase.rpc("get_recent_access_count");
      const total = Number(totalCount || data?.length || 0);
      const hourCounts: Record<string, number> = {};
      (data || []).forEach((log) => {
        const hour = format(new Date(log.accessed_at), "HH:00");
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const hours = [];
      for (let i = 23; i >= 0; i--) {
        const date = new Date();
        date.setHours(date.getHours() - i);
        const hourKey = format(date, "HH:00");
        hours.push({ hour: hourKey, requests: hourCounts[hourKey] || 0 });
      }
      return { totalRequests: total, hourlyData: hours, avgPerHour: Math.round(total / 24) };
    },
    staleTime: STALE_TIMES.STANDARD,
    refetchInterval: 60000,
  });

  const { data: dbStats, isLoading: dbLoading, refetch: refetchDb } = useQuery({
    queryKey: ["admin-db-stats"],
    queryFn: async () => {
      const [profiles, records, tokens, logs, prescriptions, appointments, reports, hospitals] = await Promise.all([
        supabase.from("user_profiles").select("id", { count: "exact", head: true }),
        supabase.from("health_records").select("id", { count: "exact", head: true }),
        supabase.from("access_tokens").select("id", { count: "exact", head: true }),
        supabase.from("access_logs").select("id", { count: "exact", head: true }),
        supabase.from("prescriptions").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("pathologist_reports").select("id", { count: "exact", head: true }),
        supabase.from("hospitals").select("id", { count: "exact", head: true }),
      ]);
      const counts: Record<string, number> = {
        user_profiles: profiles.count || 0,
        health_records: records.count || 0,
        access_tokens: tokens.count || 0,
        access_logs: logs.count || 0,
        prescriptions: prescriptions.count || 0,
        appointments: appointments.count || 0,
        pathologist_reports: reports.count || 0,
        hospitals: hospitals.count || 0,
      };
      return {
        tableCounts: counts,
        totalRows: Object.values(counts).reduce((a, b) => a + b, 0),
        tableCount: 8,
      };
    },
    staleTime: STALE_TIMES.STANDARD,
    refetchInterval: 300000,
  });

  const { data: auditStats, isLoading: auditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ["admin-audit-stats"],
    queryFn: async () => {
      const { count } = await supabase.from("audit_trail").select("id", { count: "exact", head: true });
      const { data: recentAudit } = await supabase
        .from("audit_trail")
        .select("id, event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return { totalEntries: count || 0, recentEntries: recentAudit || [] };
    },
    staleTime: STALE_TIMES.STANDARD,
    refetchInterval: 60000,
  });

  const isLoading = edgeLoading || dbLoading || auditLoading;

  const handleRefreshAll = () => {
    refetchEdge();
    refetchDb();
    refetchAudit();
  };

  // Derive live performance status
  const avgLatency = apiLatencyData
    ? Math.round(apiLatencyData.reduce((s, r) => s + r.latencyMs, 0) / apiLatencyData.length)
    : 0;

  // Derive audit integrity status
  const auditPercentage = auditIntegrity?.percentage ?? 100;
  const auditStatus = auditPercentage >= 99 ? "healthy" as const : auditPercentage >= 90 ? "warning" as const : "error" as const;

  const healthMetrics = [
    {
      name: t("adminHealth.database"),
      status: (dbStats?.totalRows || 0) > 0 ? "healthy" as const : "warning" as const,
      value: `${(dbStats?.totalRows || 0).toLocaleString()} ${t("adminHealth.rows")}`,
      description: `${dbStats?.tableCount || 0} ${t("adminHealth.tablesActive")}`,
    },
    {
      name: t("adminHealth.edgeFunctions"),
      status: "healthy" as const,
      value: `${edgeFunctionStats?.totalRequests || 0} ${t("adminHealth.calls24h")}`,
      description: `~${edgeFunctionStats?.avgPerHour || 0}/${t("adminHealth.hourAvg")}`,
    },
    {
      name: t("adminHealth.auditTrail"),
      status: auditStatus,
      value: `${auditPercentage}% ${t("adminHealth.verified")}`,
      description: `${(auditStats?.totalEntries || 0).toLocaleString()} ${t("adminHealth.entries")}`,
      target: t("adminHealth.target100"),
    },
    {
      name: t("adminHealth.performance"),
      status: avgLatency > 0 ? (avgLatency < 300 ? "healthy" as const : avgLatency < 500 ? "warning" as const : "error" as const) : "healthy" as const,
      value: avgLatency > 0 ? `${avgLatency}ms ${t("adminHealth.avg")}` : t("adminHealth.measuring"),
      description: t("adminHealth.targetApiP95"),
      target: "< 500ms",
    },
  ];

  // Aggregate active warnings from all data sources
  const activeWarnings = useMemo<HealthWarning[]>(() => {
    const warnings: HealthWarning[] = [];

    // API Latency
    const latSev = latencySeverity(avgLatency);
    if (latSev !== "healthy") {
      warnings.push({
        source: "API Latency",
        message: `Average latency ${avgLatency}ms`,
        severity: latSev,
        recommendation: RECOMMENDATIONS.apiLatency,
      });
    }

    // Audit Trail Integrity
    const auditSev = integritySeverity(auditPercentage);
    if (auditSev !== "healthy") {
      warnings.push({
        source: "Audit Trail",
        message: `Integrity at ${auditPercentage}%`,
        severity: auditSev,
        recommendation: RECOMMENDATIONS.auditTrailIntegrity,
      });
    }

    // Blockchain Integrity
    const bcPct = blockchainIntegrity?.percentage ?? 100;
    const bcSev = integritySeverity(bcPct);
    if (bcSev !== "healthy") {
      warnings.push({
        source: "Blockchain",
        message: `Integrity at ${bcPct}%`,
        severity: bcSev,
        recommendation: RECOMMENDATIONS.blockchainIntegrity,
      });
    }

    // Cross-Chain Consistency
    const ccPct = crossChainData?.percentage ?? 100;
    const ccSev = crossChainSeverity(ccPct);
    if (ccSev !== "healthy") {
      warnings.push({
        source: "Cross-Chain",
        message: `Consistency at ${ccPct}%`,
        severity: ccSev,
        recommendation: RECOMMENDATIONS.crossChainConsistency,
      });
    }

    return warnings;
  }, [avgLatency, auditPercentage, blockchainIntegrity?.percentage, crossChainData?.percentage]);

  // PDF Export
  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("System Health Report", 14, 22);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generated: ${format(new Date(), "PPP 'at' p")}`, 14, 30);

      // Health status table
      autoTable(doc, {
        startY: 38,
        head: [["Metric", "Status", "Value", "Description"]],
        body: healthMetrics.map(m => [m.name, m.status.toUpperCase(), m.value, m.description]),
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 8 },
      });

      // Integrity Summary
      let finalY = (doc as any).lastAutoTable?.finalY || 80;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Integrity Summary", 14, finalY + 10);
      autoTable(doc, {
        startY: finalY + 14,
        head: [["Check", "Score", "Status"]],
        body: [
          ["Blockchain Integrity", `${blockchainIntegrity?.percentage ?? "N/A"}%`, (blockchainIntegrity?.percentage ?? 100) >= 99 ? "HEALTHY" : "WARNING"],
          ["Audit Trail Integrity", `${auditIntegrity?.percentage ?? "N/A"}%`, (auditIntegrity?.percentage ?? 100) >= 99 ? "HEALTHY" : "WARNING"],
          ["Cross-Chain Consistency", `${crossChainData?.percentage ?? "N/A"}%`, (crossChainData?.percentage ?? 100) >= 95 ? "HEALTHY" : "WARNING"],
        ],
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 8 },
      });

      // Latency table
      if (apiLatencyData?.length) {
        finalY = (doc as any).lastAutoTable?.finalY || 80;
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("API Latency", 14, finalY + 10);
        autoTable(doc, {
          startY: finalY + 14,
          head: [["Endpoint", "Latency (ms)", "Status"]],
          body: apiLatencyData.map(r => [r.endpoint, String(r.latencyMs), r.status]),
          headStyles: { fillColor: [124, 58, 237] },
          styles: { fontSize: 8 },
        });
      }

      // Database table counts
      if (dbStats?.tableCounts) {
        finalY = (doc as any).lastAutoTable?.finalY || 140;
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Database Tables", 14, finalY + 10);
        autoTable(doc, {
          startY: finalY + 14,
          head: [["Table", "Row Count"]],
          body: Object.entries(dbStats.tableCounts).map(([t, c]) => [t, String(c)]),
          headStyles: { fillColor: [124, 58, 237] },
          styles: { fontSize: 8 },
        });
      }

      // Error Rates summary
      finalY = (doc as any).lastAutoTable?.finalY || 200;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Performance Summary", 14, finalY + 10);
      autoTable(doc, {
        startY: finalY + 14,
        head: [["Metric", "Value"]],
        body: [
          ["Average API Latency", `${avgLatency}ms`],
          ["Audit Trail Entries", String(auditStats?.totalEntries ?? 0)],
          ["24h API Calls", String(edgeFunctionStats?.totalRequests ?? 0)],
          ["Avg Calls/Hour", String(edgeFunctionStats?.avgPerHour ?? 0)],
        ],
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 8 },
      });

      doc.save(`system-health-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }, [healthMetrics, apiLatencyData, dbStats, blockchainIntegrity, auditIntegrity, crossChainData, avgLatency, auditStats, edgeFunctionStats]);

  const chartConfig = {
    requests: { label: t("adminHealth.requests"), color: "hsl(var(--primary))" },
  };

  // Last refreshed timestamp
  const lastUpdated = latencyUpdatedAt
    ? formatDistanceToNow(new Date(latencyUpdatedAt), { addSuffix: true })
    : null;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            {t("adminHealth.title")}
          </h1>
          <p className="text-muted-foreground">{t("adminHealth.subtitle")}</p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              Last updated {lastUpdated}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
            <Download className={`h-4 w-4 mr-2 ${isExporting ? "animate-pulse" : ""}`} />
            {t("adminHealth.exportPdf")}
          </Button>
          <Button variant="outline" onClick={handleRefreshAll} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            {t("adminHealth.refreshAll")}
          </Button>
        </div>
      </div>

      {/* Warnings Summary Banner */}
      <WarningsSummaryBanner warnings={activeWarnings} />

      {/* Health Status Overview */}
      <HealthStatusCards metrics={healthMetrics} />

      {/* API Latency + Error Rates */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ApiLatencyCard />
        <ErrorRatesCard />
      </div>

      {/* Blockchain + Audit Trail Integrity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BlockchainIntegrityCard />
        <AuditTrailIntegrityCard />
      </div>

      {/* Chain Break Alerts */}
      <ChainBreakAlertBanner />

      {/* Parallel Merkle Block Verification + Cross-Chain Consistency */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ParallelVerificationCard />
        <CrossChainConsistencyCard />
      </div>

      {/* Edge Function Perf + Engagement Trends */}
      <div className="grid gap-6 lg:grid-cols-2">
        <EdgeFunctionPerfCard />
        <EngagementTrendsCard />
      </div>

      {/* Active Users + Storage Usage */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ActiveUsersCard />
        <StorageUsageCard />
      </div>

      {/* API Activity + Database Growth */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {t("adminHealth.apiActivity24h")}
            </CardTitle>
            <CardDescription>{t("adminHealth.hourlyDistribution")}</CardDescription>
          </CardHeader>
          <CardContent>
            {edgeLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={edgeFunctionStats?.hourlyData || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="requests" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <DatabaseGrowthCard />
      </div>

      {/* Database Tables + Recent Audit */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t("adminHealth.databaseTables")}
            </CardTitle>
            <CardDescription>{t("adminHealth.rowCountsByTable")}</CardDescription>
          </CardHeader>
          <CardContent>
            {dbLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(dbStats?.tableCounts || {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([table, count]) => {
                    const maxCount = Math.max(...Object.values(dbStats?.tableCounts || {}));
                    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={table} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{table.replace(/_/g, " ")}</span>
                          <span className="text-muted-foreground">{count.toLocaleString()}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("adminHealth.recentAuditTrail")}
            </CardTitle>
            <CardDescription>{t("adminHealth.latestEvents")}</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {(auditStats?.recentEntries || []).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <Badge variant="outline" className="text-xs">{entry.event_type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                ))}
                {(auditStats?.recentEntries?.length || 0) === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("adminHealth.noRecentAudit")}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            {t("adminHealth.systemInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: t("adminHealth.platform"), value: "Lovable Cloud" },
              { label: t("adminHealth.databaseEngine"), value: "PostgreSQL 15" },
              { label: t("adminHealth.edgeRuntime"), value: "Deno Deploy" },
              { label: t("adminHealth.targetLcp"), value: "< 2.5s" },
              { label: t("adminHealth.targetApiP95"), value: "< 500ms" },
              { label: t("adminHealth.targetErrorRate"), value: "< 1%" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="font-medium text-sm">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
