import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Users, Activity, MapPin, Sparkles, Loader2, BarChart3, TrendingUp, Clock, Download, Radio, X } from "lucide-react";
import { useGlobalDataPool } from "@/hooks/useGlobalDataPool";
import { useGlobalPoolRealtime } from "@/hooks/useGlobalPoolRealtime";
import { GlobalPoolFilters } from "@/components/researcher/GlobalPoolFilters";
import { DatasetBuilder } from "@/components/researcher/DatasetBuilder";
import GlobalPoolClinicalDepth from "@/components/researcher/GlobalPoolClinicalDepth";
import { ComorbidityHeatmap } from "@/components/researcher/ComorbidityHeatmap";
import { MedDiseaseMatrix } from "@/components/researcher/MedDiseaseMatrix";
import { PoolTemporalTrends } from "@/components/researcher/PoolTemporalTrends";
import { JurisdictionComparison } from "@/components/researcher/JurisdictionComparison";
import { HypothesisGenerator } from "@/components/researcher/HypothesisGenerator";
import { SampleSizeCalculator } from "@/components/researcher/SampleSizeCalculator";
import { RiskStratificationModel } from "@/components/researcher/RiskStratificationModel";
import { PoolDataExplorer } from "@/components/researcher/PoolDataExplorer";
import { useRechartsComponents, ChartSkeleton } from "@/components/shared/LazyChart";
import { LazyPDFButton, type PDFContentItem } from "@/components/shared/LazyPDFExport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const GlobalDataPoolPage = () => {
  const { poolData, isLoading, filters, setFilters, stats } = useGlobalDataPool();
  const { recentContributions, newCount, dismissNotifications } = useGlobalPoolRealtime();
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const { components: RC, isLoading: chartsLoading } = useRechartsComponents();

  const diseaseChartData = Object.entries(stats.diseaseDistribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const ageChartData = Object.entries(stats.ageDistribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));

  const genderChartData = Object.entries(stats.genderDistribution)
    .map(([name, value]) => ({ name, value }));

  const radarData = Object.entries(stats.dataCategoryCompleteness).map(([category, coverage]) => ({
    category: category.replace('_', ' '),
    coverage,
    fullMark: 100,
  }));

  // PDF content builder
  const buildPDFContent = (): PDFContentItem[] => {
    const items: PDFContentItem[] = [
      { type: 'heading', text: 'Pool Overview', level: 2 },
      { type: 'keyValue', data: {
        'Total Contributors': String(stats.totalContributors),
        'Disease Categories': String(stats.diseaseCategories.length),
        'Jurisdictions': String(stats.jurisdictions.length),
        'Growth (this month)': `+${stats.growthStats.thisMonth} (${stats.growthStats.growthRate >= 0 ? '+' : ''}${stats.growthStats.growthRate}%)`,
        'Data Freshness (median)': `${stats.freshness.medianAgeDays} days`,
      }},
      { type: 'divider' },
      { type: 'heading', text: 'Disease Distribution', level: 2 },
      { type: 'table', headers: ['Disease', 'Count'], rows: diseaseChartData.map(d => [d.name, String(d.value)]) },
      { type: 'divider' },
      { type: 'heading', text: 'Data Category Completeness', level: 2 },
      { type: 'table', headers: ['Category', 'Coverage %'], rows: Object.entries(stats.dataCategoryCompleteness).map(([k, v]) => [k, `${v}%`]) },
      { type: 'divider' },
      { type: 'heading', text: 'Active Filters', level: 2 },
      { type: 'paragraph', text: Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None' },
    ];
    return items;
  };

  const runAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const summary = {
        total: poolData.length,
        diseases: stats.diseaseDistribution,
        ages: stats.ageDistribution,
        genders: stats.genderDistribution,
        jurisdictions: stats.jurisdictions,
        filters: Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none',
      };

      const { data, error } = await supabase.functions.invoke('research-ai-insights', {
        body: {
          cohortStats: {
            totalShares: poolData.length,
            uniquePatients: poolData.length,
            anonymized: poolData.length,
            identified: 0,
            diseaseDistribution: stats.diseaseDistribution,
            statusBreakdown: {},
            genderDistribution: stats.genderDistribution,
            ageDistribution: stats.ageDistribution,
          },
          includeLiterature: false,
        },
      });

      if (error) throw error;
      setAiInsight(data?.insight || 'No insights generated.');
    } catch (err) {
      toast({ title: "Analysis failed", description: "Could not generate AI insights.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Global Research Data Pool
          </h1>
          <p className="text-muted-foreground mt-1">Browse and analyze anonymized health data contributed by patients worldwide</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <LazyPDFButton
            options={{
              filename: 'global-data-pool-report',
              title: 'Global Research Data Pool Report',
              subtitle: `Generated with ${stats.totalContributors} contributors`,
              content: buildPDFContent(),
            }}
            variant="outline"
            size="default"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </LazyPDFButton>
          <Button onClick={runAiAnalysis} disabled={aiLoading || poolData.length === 0}>
            {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            AI Aggregate Analysis
          </Button>
        </div>
      </div>

      {/* Real-time notification banner */}
      {newCount > 0 && (
        <Card className="border-primary/40 bg-primary/5 animate-in fade-in slide-in-from-top-2">
          <CardContent className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
              </span>
              <Radio className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {newCount} new contribution{newCount > 1 ? "s" : ""} received in real-time
              </span>
              {recentContributions.length > 0 && (
                <div className="hidden md:flex items-center gap-1.5">
                  {recentContributions.slice(0, 3).map((c) => (
                    <Badge key={c.id} variant="secondary" className="text-[10px]">
                      {c.source_jurisdiction} · {(c.disease_categories || []).slice(0, 1).join("")}
                    </Badge>
                  ))}
                  {recentContributions.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{recentContributions.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={dismissNotifications}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats.totalContributors}</p>
            <p className="text-xs text-muted-foreground">Contributors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Activity className="h-6 w-6 mx-auto text-accent mb-1" />
            <p className="text-2xl font-bold">{stats.diseaseCategories.length}</p>
            <p className="text-xs text-muted-foreground">Disease Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <MapPin className="h-6 w-6 mx-auto text-secondary mb-1" />
            <p className="text-2xl font-bold">{stats.jurisdictions.length}</p>
            <p className="text-xs text-muted-foreground">Jurisdictions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{Object.keys(stats.ageDistribution).length}</p>
            <p className="text-xs text-muted-foreground">Age Groups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto text-accent mb-1" />
            <p className="text-2xl font-bold">+{stats.growthStats.thisMonth}</p>
            <p className="text-xs text-muted-foreground">
              This Month
              <Badge variant={stats.growthStats.growthRate >= 0 ? "default" : "destructive"} className="ml-1 text-[10px] px-1 py-0">
                {stats.growthStats.growthRate >= 0 ? '+' : ''}{stats.growthStats.growthRate}%
              </Badge>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats.freshness.medianAgeDays}d</p>
            <p className="text-xs text-muted-foreground">Median Freshness</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{aiInsight}</p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <GlobalPoolFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableDiseases={stats.diseaseCategories}
            availableJurisdictions={stats.jurisdictions}
          />
        </CardContent>
      </Card>

      {/* Export & Dataset Builder */}
      <DatasetBuilder
        poolData={poolData}
        filters={filters as Record<string, string | undefined>}
        onLoadFilters={(f) => setFilters(f as any)}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disease Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disease Distribution</CardTitle>
            <CardDescription>Top disease categories in the pool</CardDescription>
          </CardHeader>
          <CardContent>
            {chartsLoading || !RC ? <ChartSkeleton height={250} /> : diseaseChartData.length > 0 ? (
              <RC.ResponsiveContainer width="100%" height={250}>
                <RC.BarChart data={diseaseChartData}>
                  <RC.XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                  <RC.YAxis tick={{ fontSize: 11 }} />
                  <RC.Tooltip />
                  <RC.Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </RC.BarChart>
              </RC.ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {chartsLoading || !RC ? <ChartSkeleton height={250} /> : genderChartData.length > 0 ? (
              <RC.ResponsiveContainer width="100%" height={250}>
                <RC.PieChart>
                  <RC.Pie data={genderChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {genderChartData.map((_, i) => <RC.Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </RC.Pie>
                  <RC.Tooltip />
                </RC.PieChart>
              </RC.ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Age Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {chartsLoading || !RC ? <ChartSkeleton height={200} /> : ageChartData.length > 0 ? (
              <RC.ResponsiveContainer width="100%" height={200}>
                <RC.BarChart data={ageChartData}>
                  <RC.XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <RC.YAxis tick={{ fontSize: 11 }} />
                  <RC.Tooltip />
                  <RC.Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </RC.BarChart>
              </RC.ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Data Completeness Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Completeness</CardTitle>
            <CardDescription>Coverage of each data category across contributions</CardDescription>
          </CardHeader>
          <CardContent>
            {chartsLoading || !RC ? <ChartSkeleton height={200} /> : radarData.length > 0 ? (
              <RC.ResponsiveContainer width="100%" height={200}>
                <RC.RadarChart data={radarData}>
                  <RC.PolarGrid />
                  <RC.PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <RC.PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <RC.Radar name="Coverage %" dataKey="coverage" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  <RC.Tooltip />
                </RC.RadarChart>
              </RC.ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clinical Data Overview */}
      <GlobalPoolClinicalDepth poolData={poolData} />

      {/* Predictive Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HypothesisGenerator stats={stats} />
        <SampleSizeCalculator poolSize={stats.totalContributors} />
      </div>

      <RiskStratificationModel stats={stats} />

      {/* Advanced Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComorbidityHeatmap poolData={poolData} />
        <MedDiseaseMatrix poolData={poolData} />
      </div>

      <PoolTemporalTrends poolData={poolData} />
      <JurisdictionComparison poolData={poolData} />

      {/* Data Explorer */}
      <PoolDataExplorer poolData={poolData} isLoading={isLoading} />
    </div>
  );
};

export default GlobalDataPoolPage;
