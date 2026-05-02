import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePatientResearcherShares } from "@/hooks/usePatientResearcherShares";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRechartsComponents, ChartSkeleton } from "@/components/shared/LazyChart";
import { AIResearchInsights } from "@/components/researcher/AIResearchInsights";
import { ScheduledReportConfig } from "@/components/researcher/ScheduledReportConfig";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  BarChart3, Users, ShieldCheck, ShieldOff, Clock, CheckCircle, RefreshCw,
} from "lucide-react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(142 76% 36%)",
];

const CohortAnalyticsPage = () => {
  const { user } = useAuth();
  const { researcherShares, isLoading: sharesLoading } = usePatientResearcherShares();
  const { components: recharts, isLoading: chartsLoading } = useRechartsComponents();
  const isMobile = useIsMobile();

  const { data: patientProfiles = [], isLoading: profilesLoading, refetch } = useQuery({
    queryKey: ["cohort-analytics-profiles", user?.id, researcherShares.length],
    queryFn: async () => {
      if (!user?.id || researcherShares.length === 0) return [];
      const nonAnonIds = researcherShares
        .filter((s) => !s.is_anonymized)
        .map((s) => s.patient_id);
      const uniqueNonAnon = [...new Set(nonAnonIds)];
      if (uniqueNonAnon.length === 0) return [];

      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, gender, date_of_birth")
        .in("user_id", uniqueNonAnon.slice(0, 50));
      return data || [];
    },
    enabled: !!user?.id && researcherShares.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = sharesLoading || profilesLoading;

  // --- Compute analytics ---
  const diseaseCounts = researcherShares.reduce((acc, s) => {
    const cat = s.disease_category || "General";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const diseaseData = Object.entries(diseaseCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "),
    value,
  }));

  const statusCounts = researcherShares.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const genderCounts = patientProfiles.reduce((acc, p) => {
    const g = p.gender || "Unknown";
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const genderData = Object.entries(genderCounts).map(([name, value]) => ({ name, value }));

  const ageBuckets: Record<string, number> = { "0-17": 0, "18-30": 0, "31-45": 0, "46-60": 0, "61-75": 0, "76+": 0 };
  patientProfiles.forEach((p) => {
    if (!p.date_of_birth) return;
    const age = Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) ageBuckets["0-17"]++;
    else if (age <= 30) ageBuckets["18-30"]++;
    else if (age <= 45) ageBuckets["31-45"]++;
    else if (age <= 60) ageBuckets["46-60"]++;
    else if (age <= 75) ageBuckets["61-75"]++;
    else ageBuckets["76+"]++;
  });
  const ageData = Object.entries(ageBuckets).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  const anonCount = researcherShares.filter((s) => s.is_anonymized).length;
  const identifiedCount = researcherShares.length - anonCount;
  const uniquePatients = new Set(researcherShares.map((s) => s.patient_id)).size;

  const chartHeight = isMobile ? 220 : 280;

  const renderCharts = () => {
    if (chartsLoading || !recharts) {
      return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Condition Distribution</CardTitle></CardHeader><CardContent><ChartSkeleton height={chartHeight} /></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Share Status</CardTitle></CardHeader><CardContent><ChartSkeleton height={chartHeight} /></CardContent></Card>
        </div>
      );
    }

    const { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } = recharts;

    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Condition Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Condition Distribution</CardTitle>
            <CardDescription className="text-xs">By disease category</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <PieChart>
                <Pie
                  data={diseaseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 40 : 60}
                  outerRadius={isMobile ? 70 : 100}
                  paddingAngle={4}
                  dataKey="value"
                  label={isMobile ? false : ({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={!isMobile}
                >
                  {diseaseData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  wrapperStyle={{ fontSize: isMobile ? 11 : 12 }}
                  iconSize={isMobile ? 8 : 10}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Share Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Share Status</CardTitle>
            <CardDescription className="text-xs">Current status of all shares</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={statusData} margin={isMobile ? { left: -15, right: 5 } : undefined}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 30 : 40} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        {genderData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Gender Distribution</CardTitle>
              <CardDescription className="text-xs">Demographics of identified patients</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 70 : 100}
                    paddingAngle={4}
                    dataKey="value"
                    label={isMobile ? false : ({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={!isMobile}
                  >
                    {genderData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    wrapperStyle={{ fontSize: isMobile ? 11 : 12 }}
                    iconSize={isMobile ? 8 : 10}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Age Distribution */}
        {ageData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Age Distribution</CardTitle>
              <CardDescription className="text-xs">Age brackets of identified patients</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={ageData} margin={isMobile ? { left: -15, right: 5 } : undefined}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 30 : 40} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  /* ---- Compact stat card for mobile ---- */
  const StatCard = ({
    label,
    value,
    icon: Icon,
    accent = false,
  }: {
    label: string;
    value: number;
    icon: React.ElementType;
    accent?: boolean;
  }) => (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-3 p-3 sm:p-4">
        <div className="shrink-0 rounded-md bg-muted p-2">
          <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-xl sm:text-2xl font-bold leading-none ${accent ? "text-primary" : ""}`}>
            {value}
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 sm:h-8 sm:w-8 text-primary shrink-0" />
            <span className="truncate">Cohort Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {researcherShares.length} patient data shares
          </p>
        </div>
        <Button
          variant="outline"
          size={isMobile ? "icon" : "default"}
          onClick={() => refetch()}
          disabled={isLoading}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isMobile ? "" : "mr-2"} ${isLoading ? "animate-spin" : ""}`} />
          {!isMobile && "Refresh"}
        </Button>
      </div>

      {/* Summary Stats — 2-col on mobile, 5-col on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <StatCard label="Unique Patients" value={uniquePatients} icon={Users} />
        <StatCard label="Anonymized" value={anonCount} icon={ShieldCheck} />
        <StatCard label="Identified" value={identifiedCount} icon={ShieldOff} />
        <StatCard label="Pending" value={statusCounts["pending"] || 0} icon={Clock} accent />
        <StatCard label="Completed" value={statusCounts["completed"] || 0} icon={CheckCircle} />
      </div>

      {/* Charts or Empty State */}
      {researcherShares.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-base font-medium">No data to analyze yet</h3>
            <p className="text-muted-foreground text-xs text-center mt-1">
              Charts will appear once patients share their data with you
            </p>
          </CardContent>
        </Card>
      ) : (
        renderCharts()
      )}

      {researcherShares.length > 0 && (
        <>
          <AIResearchInsights
            cohortStats={{
              totalShares: researcherShares.length,
              uniquePatients,
              anonymized: anonCount,
              identified: identifiedCount,
              diseaseDistribution: diseaseCounts,
              statusBreakdown: statusCounts,
              genderDistribution: genderCounts,
              ageDistribution: ageBuckets,
            }}
          />
          <ScheduledReportConfig />
        </>
      )}
    </div>
  );
};

export default CohortAnalyticsPage;
