import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Clock, AlertTriangle, CheckCircle, RefreshCw, Download, Filter } from "lucide-react";
import { useDataQualityMetrics, DataQualityFilters } from "@/hooks/useDataQualityMetrics";
import { useRechartsComponents, ChartSkeleton } from "@/components/shared/LazyChart";
import { LazyPDFButton } from "@/components/shared/LazyPDFExport";

const COLORS = ["hsl(142 76% 36%)", "hsl(var(--primary))", "hsl(var(--chart-4))", "hsl(0 72% 51%)"];
const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(142 76% 36%)", "hsl(280 65% 60%)", "hsl(30 80% 55%)"];

const DataQualityDashboardPage = () => {
  const [filters, setFilters] = useState<DataQualityFilters>({});
  const {
    overallScore, totalShares, completenessRate, anonymizationRate,
    averageAgeDays, qualityDistribution, lowestQualityShares,
    freshShares, staleShares, diseaseBreakdown, qualityTrend,
    dimensionScores, availableCategories, isLoading,
  } = useDataQualityMetrics(filters);
  const { components: recharts, isLoading: chartsLoading } = useRechartsComponents();

  const pdfOptions = useMemo(() => ({
    filename: "data-quality-report",
    title: "Data Quality Report",
    subtitle: `Generated from ${totalShares} data shares`,
    content: [
      { type: "keyValue" as const, data: { "Overall Quality": `${overallScore}%`, "Completeness": `${completenessRate}%`, "Anonymization": `${anonymizationRate}%`, "Avg Age": `${averageAgeDays} days`, "Fresh Shares": `${freshShares}`, "Stale Shares": `${staleShares}` } },
      { type: "divider" as const },
      { type: "heading" as const, text: "Quality Distribution", level: 2 as const },
      { type: "table" as const, headers: ["Tier", "Count"], rows: qualityDistribution.map(q => [q.label, String(q.count)]) },
      { type: "heading" as const, text: "Disease Breakdown", level: 2 as const },
      { type: "table" as const, headers: ["Category", "Avg Score", "Count"], rows: diseaseBreakdown.map(d => [d.category, `${d.avgScore}%`, String(d.count)]) },
      { type: "heading" as const, text: "Dimension Scores", level: 2 as const },
      { type: "table" as const, headers: ["Dimension", "Score"], rows: dimensionScores.map(d => [d.dimension, `${d.score}%`]) },
      { type: "heading" as const, text: "Lowest Quality Shares", level: 2 as const },
      { type: "table" as const, headers: ["Category", "Score", "Date"], rows: lowestQualityShares.map(s => [s.disease_category, `${s.score}%`, new Date(s.created_at).toLocaleDateString()]) },
    ],
  }), [overallScore, totalShares, completenessRate, anonymizationRate, averageAgeDays, freshShares, staleShares, qualityDistribution, diseaseBreakdown, dimensionScores, lowestQualityShares]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" /> Data Quality
        </h1>
        <Card><CardContent className="py-12 flex justify-center"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
      </div>
    );
  }

  const hasAnyData = totalShares > 0 || availableCategories.length > 0;
  const hasFilteredResults = totalShares > 0;

  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" /> Data Quality
        </h1>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <ShieldCheck className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No data to assess</h3>
            <p className="text-muted-foreground text-sm">Quality metrics will appear once you receive patient data shares.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" /> Data Quality Dashboard
          </h1>
          <p className="text-muted-foreground">Aggregate data quality metrics across {totalShares} shares</p>
        </div>
        <LazyPDFButton options={pdfOptions} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> Download Report
        </LazyPDFButton>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filters.disease || "__all__"} onValueChange={v => setFilters(f => ({ ...f, disease: v === "__all__" ? undefined : v }))}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All categories</SelectItem>
                {availableCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.timeRange || "all"} onValueChange={v => setFilters(f => ({ ...f, timeRange: v === "all" ? undefined : v as any }))}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="All time" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.tier || "__all__"} onValueChange={v => setFilters(f => ({ ...f, tier: v === "__all__" ? undefined : v as any }))}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="All tiers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All tiers</SelectItem>
                <SelectItem value="Excellent">Excellent</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
              </SelectContent>
            </Select>
            {(filters.disease || filters.timeRange || filters.tier) && (
              <button onClick={() => setFilters({})} className="text-xs text-muted-foreground hover:text-foreground underline">Clear</button>
            )}
          </div>
        </CardContent>
      </Card>

      {!hasFilteredResults ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Filter className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No shares match filters</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your filter criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Overall Quality</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{overallScore}%</div>
                <Progress value={overallScore} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completeness</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completenessRate}%</div>
                <p className="text-xs text-muted-foreground">Shares with disease + completed status</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Anonymization</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{anonymizationRate}%</div>
                <p className="text-xs text-muted-foreground">Anonymized data shares</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Freshness</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageAgeDays}d</div>
                <p className="text-xs text-muted-foreground">{freshShares} fresh · {staleShares} stale</p>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Quality Distribution + Lowest Quality */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quality Distribution</CardTitle>
                <CardDescription>Breakdown by quality tier</CardDescription>
              </CardHeader>
              <CardContent>
                {chartsLoading || !recharts ? <ChartSkeleton height={250} /> : (
                  <recharts.ResponsiveContainer width="100%" height={250}>
                    <recharts.BarChart data={qualityDistribution}>
                      <recharts.CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <recharts.XAxis dataKey="label" />
                      <recharts.YAxis allowDecimals={false} />
                      <recharts.Tooltip />
                      <recharts.Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {qualityDistribution.map((_, i) => (
                          <recharts.Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </recharts.Bar>
                    </recharts.BarChart>
                  </recharts.ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" /> Lowest Quality Shares
                </CardTitle>
                <CardDescription>Shares needing attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowestQualityShares.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{s.disease_category}</p>
                        <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={s.score >= 60 ? "secondary" : "destructive"}>{s.score}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Disease Breakdown Pie + Quality Trend Line */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Disease Category Breakdown</CardTitle>
                <CardDescription>Quality by disease area</CardDescription>
              </CardHeader>
              <CardContent>
                {chartsLoading || !recharts ? <ChartSkeleton height={280} /> : (
                  <recharts.ResponsiveContainer width="100%" height={280}>
                    <recharts.PieChart>
                      <recharts.Pie
                        data={diseaseBreakdown}
                        dataKey="count"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                        label={({ category, avgScore }: any) => `${category} (${avgScore}%)`}
                      >
                        {diseaseBreakdown.map((_, i) => (
                          <recharts.Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </recharts.Pie>
                      <recharts.Tooltip formatter={(value: any, name: any, props: any) => [`${value} shares (avg ${props.payload.avgScore}%)`, props.payload.category]} />
                    </recharts.PieChart>
                  </recharts.ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Quality Trend</CardTitle>
                <CardDescription>Average quality score over time</CardDescription>
              </CardHeader>
              <CardContent>
                {chartsLoading || !recharts ? <ChartSkeleton height={280} /> : (
                  qualityTrend.length < 2 ? (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                      Need at least 2 months of data to show trends
                    </div>
                  ) : (
                    <recharts.ResponsiveContainer width="100%" height={280}>
                      <recharts.LineChart data={qualityTrend}>
                        <recharts.CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <recharts.XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <recharts.YAxis domain={[0, 100]} />
                        <recharts.Tooltip formatter={(value: any) => [`${value}%`, "Avg Quality"]} />
                        <recharts.Line type="monotone" dataKey="avgScore" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                      </recharts.LineChart>
                    </recharts.ResponsiveContainer>
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 4: Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Quality Dimension Breakdown</CardTitle>
              <CardDescription>Percentage achieved per scoring dimension (100% = max possible for that dimension)</CardDescription>
            </CardHeader>
            <CardContent>
              {chartsLoading || !recharts ? <ChartSkeleton height={300} /> : (
                <recharts.ResponsiveContainer width="100%" height={300}>
                  <recharts.RadarChart data={dimensionScores} cx="50%" cy="50%" outerRadius="75%">
                    <recharts.PolarGrid className="stroke-border" />
                    <recharts.PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                    <recharts.PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <recharts.Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                    <recharts.Tooltip formatter={(value: any) => [`${value}%`, "Score"]} />
                  </recharts.RadarChart>
                </recharts.ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default DataQualityDashboardPage;
