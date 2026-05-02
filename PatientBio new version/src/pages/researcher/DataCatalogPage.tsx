import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useGlobalDataPool } from "@/hooks/useGlobalDataPool";
import { DataCatalogCard } from "@/components/researcher/DataCatalogCard";
import { DataCatalogDetailDialog } from "@/components/researcher/DataCatalogDetailDialog";
import { DomainSelector } from "@/components/researcher/DomainSelector";
import RequestPatientDataDialog from "@/components/researcher/RequestPatientDataDialog";
import { useRechartsComponents, ChartSkeleton } from "@/components/shared/LazyChart";
import { tooltipStyle, COLORS } from "@/components/doctor/analytics/AnalyticsChartTypes";
import { Search, Globe, Database, Loader2, BarChart3, ChevronDown, ArrowUpDown, LayoutGrid, Table } from "lucide-react";
import { differenceInDays, format, startOfMonth } from "date-fns";

const ALL_DATA_CATEGORIES = ['prescriptions', 'diagnoses', 'vitals', 'lab_results', 'allergies', 'demographics'];

type SortKey = "count" | "quality" | "freshness" | "completeness";
type ViewMode = "grid" | "table";

const DataCatalogPage = () => {
  const { poolData, isLoading, stats } = useGlobalDataPool();
  const { components: rc, isLoading: chartsLoading } = useRechartsComponents();
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string[]>([]);
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>("");
  const [qualityTier, setQualityTier] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortKey>("count");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [detailDisease, setDetailDisease] = useState<string | null>(null);
  const [requestDisease, setRequestDisease] = useState<string | null>(null);

  const now = new Date();

  // Build enriched catalog entries with per-disease metrics
  const catalogEntries = useMemo(() => {
    const entries = Object.entries(stats.diseaseDistribution).map(([disease, count]) => {
      const diseaseItems = poolData.filter((p: any) => (p.disease_categories || []).includes(disease));

      // Quality
      const scores = diseaseItems.map((d: any) => d.quality_score).filter((s: any) => s != null) as number[];
      const qualityScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      // Freshness
      const ages = diseaseItems.map((d: any) => differenceInDays(now, new Date(d.contributed_at))).sort((a, b) => a - b);
      const medianAgeDays = ages.length > 0 ? ages[Math.floor(ages.length / 2)] : 999;
      const freshnessLabel: "Fresh" | "Recent" | "Aging" | "Stale" =
        medianAgeDays < 30 ? "Fresh" : medianAgeDays < 90 ? "Recent" : medianAgeDays < 180 ? "Aging" : "Stale";

      // Gender
      const genderSplit = { male: 0, female: 0, other: 0 };
      diseaseItems.forEach((d: any) => {
        const g = (d.gender || "").toLowerCase();
        if (g === "male") genderSplit.male++;
        else if (g === "female") genderSplit.female++;
        else genderSplit.other++;
      });

      // Data category coverage
      const total = diseaseItems.length || 1;
      const dataCategoryCoverage: Record<string, number> = {};
      ALL_DATA_CATEGORIES.forEach((cat) => {
        dataCategoryCoverage[cat] = Math.round((diseaseItems.filter((d: any) => d.data_categories.includes(cat)).length / total) * 100);
      });

      const completenessScore = Math.round(Object.values(dataCategoryCoverage).reduce((a, b) => a + b, 0) / ALL_DATA_CATEGORIES.length);

      // Jurisdictions & comorbidities
      const jurisdictions = [...new Set(diseaseItems.map((p: any) => p.source_jurisdiction))];
      const comorbidities: Record<string, number> = {};
      diseaseItems.forEach((p: any) => {
        (p.disease_categories || []).forEach((d: string) => {
          if (d !== disease) comorbidities[d] = (comorbidities[d] || 0) + 1;
        });
      });
      const topComorbidities = Object.entries(comorbidities).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);

      return {
        disease, count, qualityScore, freshnessLabel, medianAgeDays, genderSplit,
        dataCategoryCoverage, completenessScore, jurisdictions, topComorbidities,
      };
    });

    // Filters
    let filtered = entries;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((e) => e.disease.toLowerCase().includes(q));
    }
    if (domainFilter.length > 0) {
      const domainDiseaseMap: Record<string, string[]> = {
        oncology: ["oncology", "cancer"], cardiology: ["cardiovascular", "cardiac"],
        neurology: ["neurology", "neurological"], epidemiology: ["infectious_disease", "public_health"],
        immunology: ["immunology", "autoimmune"], endocrinology: ["diabetes", "endocrine"],
        pulmonology: ["respiratory", "pulmonary"], mental_health: ["mental_health", "psychiatric"],
        pediatrics: ["pediatric"],
      };
      const matchDiseases = domainFilter.flatMap((d) => domainDiseaseMap[d] || [d]);
      filtered = filtered.filter((e) => matchDiseases.some((m) => e.disease.toLowerCase().includes(m)));
    }
    if (jurisdictionFilter) {
      filtered = filtered.filter((e) => e.jurisdictions.includes(jurisdictionFilter));
    }
    if (qualityTier === "high") filtered = filtered.filter((e) => e.qualityScore >= 80);
    else if (qualityTier === "medium") filtered = filtered.filter((e) => e.qualityScore >= 50 && e.qualityScore < 80);
    else if (qualityTier === "low") filtered = filtered.filter((e) => e.qualityScore < 50);

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "count") return b.count - a.count;
      if (sortBy === "quality") return b.qualityScore - a.qualityScore;
      if (sortBy === "freshness") return a.medianAgeDays - b.medianAgeDays;
      return b.completenessScore - a.completenessScore;
    });

    return filtered;
  }, [stats, poolData, search, domainFilter, jurisdictionFilter, qualityTier, sortBy]);

  // Aggregate chart data
  const topDiseasesChart = useMemo(() =>
    Object.entries(stats.diseaseDistribution)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 15)
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value })),
    [stats.diseaseDistribution]
  );

  const contributionTimeline = useMemo(() => {
    const months: Record<string, number> = {};
    poolData.forEach((d: any) => {
      const key = format(startOfMonth(new Date(d.contributed_at)), "yyyy-MM");
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count }));
  }, [poolData]);

  // Detail dialog items
  const detailItems = useMemo(() => {
    if (!detailDisease) return [];
    return poolData.filter((p: any) => (p.disease_categories || []).includes(detailDisease));
  }, [detailDisease, poolData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Database className="h-8 w-8 text-primary" />
          Data Discovery Catalog
        </h1>
        <p className="text-muted-foreground">
          Explore available research data across the platform by disease, domain, and jurisdiction
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><Globe className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{stats.totalContributors}</p><p className="text-xs text-muted-foreground">Total Records</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><BarChart3 className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{stats.diseaseCategories.length}</p><p className="text-xs text-muted-foreground">Disease Categories</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><Database className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{stats.jurisdictions.length}</p><p className="text-xs text-muted-foreground">Jurisdictions</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><Search className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold">{catalogEntries.length}</p><p className="text-xs text-muted-foreground">Discoverable Datasets</p></CardContent></Card>
      </div>

      {/* Platform Overview (Collapsible) */}
      <Collapsible open={overviewOpen} onOpenChange={setOverviewOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Platform Overview</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${overviewOpen ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Diseases Bar */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Top Disease Categories</h4>
                  {chartsLoading || !rc ? <ChartSkeleton height={300} /> : (
                    <rc.ResponsiveContainer width="100%" height={300}>
                      <rc.BarChart data={topDiseasesChart} layout="vertical" margin={{ left: 80 }}>
                        <rc.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <rc.XAxis type="number" tick={{ fontSize: 10 }} />
                        <rc.YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={75} />
                        <rc.Tooltip contentStyle={tooltipStyle} />
                        <rc.Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </rc.BarChart>
                    </rc.ResponsiveContainer>
                  )}
                </div>
                {/* Contribution Timeline */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Contribution Timeline</h4>
                  {chartsLoading || !rc ? <ChartSkeleton height={300} /> : (
                    <rc.ResponsiveContainer width="100%" height={300}>
                      <rc.AreaChart data={contributionTimeline}>
                        <rc.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <rc.XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <rc.YAxis tick={{ fontSize: 10 }} />
                        <rc.Tooltip contentStyle={tooltipStyle} />
                        <rc.Area type="monotone" dataKey="count" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" />
                      </rc.AreaChart>
                    </rc.ResponsiveContainer>
                  )}
                </div>
              </div>
              {/* Data Category Heatmap */}
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Data Category Availability Across Top Diseases</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left p-1 font-medium text-muted-foreground">Disease</th>
                        {ALL_DATA_CATEGORIES.map(c => (
                          <th key={c} className="p-1 font-medium text-muted-foreground capitalize text-center">{c.replace(/_/g, " ").slice(0, 6)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {catalogEntries.slice(0, 10).map((e) => (
                        <tr key={e.disease} className="border-t border-border/50">
                          <td className="p-1 capitalize text-foreground">{e.disease.replace(/_/g, " ")}</td>
                          {ALL_DATA_CATEGORIES.map(cat => {
                            const pct = e.dataCategoryCoverage[cat] || 0;
                            const bg = pct >= 75 ? "bg-green-500/20" : pct >= 40 ? "bg-amber-500/20" : pct > 0 ? "bg-red-500/20" : "bg-muted/30";
                            return (
                              <td key={cat} className={`p-1 text-center ${bg} rounded-sm`}>
                                {pct > 0 ? `${pct}%` : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter & Sort</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search disease..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <DomainSelector value={domainFilter} onChange={setDomainFilter} placeholder="Research domain" />
            <Select value={jurisdictionFilter || "all"} onValueChange={(v) => setJurisdictionFilter(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Jurisdiction" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jurisdictions</SelectItem>
                {stats.jurisdictions.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={qualityTier || "all"} onValueChange={(v) => setQualityTier(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Quality tier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quality</SelectItem>
                <SelectItem value="high">High (≥80%)</SelectItem>
                <SelectItem value="medium">Medium (50-79%)</SelectItem>
                <SelectItem value="low">Low (&lt;50%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" /> Sort:
            </div>
            {(["count", "quality", "freshness", "completeness"] as SortKey[]).map((key) => (
              <Button key={key} size="sm" variant={sortBy === key ? "default" : "ghost"} className="h-7 text-xs capitalize" onClick={() => setSortBy(key)}>
                {key}
              </Button>
            ))}
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant={viewMode === "grid" ? "default" : "ghost"} className="h-7 px-2" onClick={() => setViewMode("grid")}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant={viewMode === "table" ? "default" : "ghost"} className="h-7 px-2" onClick={() => setViewMode("table")}>
                <Table className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {catalogEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No datasets match your filters.</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogEntries.map((entry) => (
            <DataCatalogCard
              key={entry.disease}
              disease={entry.disease}
              count={entry.count}
              totalRecords={stats.totalContributors}
              completenessScore={entry.completenessScore}
              jurisdictions={entry.jurisdictions}
              topComorbidities={entry.topComorbidities}
              qualityScore={entry.qualityScore}
              freshnessLabel={entry.freshnessLabel}
              medianAgeDays={entry.medianAgeDays}
              genderSplit={entry.genderSplit}
              dataCategoryCoverage={entry.dataCategoryCoverage}
              onExplore={() => setDetailDisease(entry.disease)}
              onRequestData={() => setRequestDisease(entry.disease)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-medium">Disease</th>
                    <th className="text-right p-3 font-medium">Records</th>
                    <th className="text-right p-3 font-medium">Quality</th>
                    <th className="text-center p-3 font-medium">Freshness</th>
                    <th className="text-right p-3 font-medium">Completeness</th>
                    <th className="text-right p-3 font-medium">Jurisdictions</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogEntries.map((e) => (
                    <tr key={e.disease} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3 capitalize font-medium">{e.disease.replace(/_/g, " ")}</td>
                      <td className="p-3 text-right">{e.count}</td>
                      <td className="p-3 text-right">{e.qualityScore}%</td>
                      <td className="p-3 text-center"><Badge variant="outline" className="text-xs">{e.freshnessLabel}</Badge></td>
                      <td className="p-3 text-right">{e.completenessScore}%</td>
                      <td className="p-3 text-right">{e.jurisdictions.length}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDetailDisease(e.disease)}>Explore</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRequestDisease(e.disease)}>Request</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      {detailDisease && (
        <DataCatalogDetailDialog
          open={!!detailDisease}
          onOpenChange={(open) => !open && setDetailDisease(null)}
          disease={detailDisease}
          diseaseItems={detailItems}
          onRequestData={() => { setDetailDisease(null); setRequestDisease(detailDisease); }}
        />
      )}

      {/* Request Data Dialog */}
      {requestDisease && (
        <RequestPatientDataDialog
          defaultDiseaseCategory={requestDisease}
          open={!!requestDisease}
          onOpenChange={(open) => !open && setRequestDisease(null)}
        />
      )}
    </div>
  );
};

export default DataCatalogPage;
