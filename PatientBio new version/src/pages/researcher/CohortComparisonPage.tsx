import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GitCompareArrows, RefreshCw } from "lucide-react";
import { useResearcherSavedCohorts } from "@/hooks/useResearcherSavedCohorts";
import { usePatientResearcherShares } from "@/hooks/usePatientResearcherShares";
import { useRechartsComponents, ChartSkeleton } from "@/components/shared/LazyChart";

const COLORS_A = ["hsl(var(--primary))", "hsl(var(--chart-2))"];
const COLORS_B = ["hsl(var(--chart-3))", "hsl(var(--chart-4))"];

const CohortComparisonPage = () => {
  const { cohorts, isLoading: cohortsLoading } = useResearcherSavedCohorts();
  const { researcherShares } = usePatientResearcherShares();
  const { components: recharts, isLoading: chartsLoading } = useRechartsComponents();
  const [cohortA, setCohortA] = useState<string>("");
  const [cohortB, setCohortB] = useState<string>("");

  const filterShares = (filters: any) => {
    return researcherShares.filter((s) => {
      if (filters.diseaseCategories?.length && !filters.diseaseCategories.includes(s.disease_category)) return false;
      if (filters.status && s.status !== filters.status) return false;
      if (filters.anonymizedOnly && !s.is_anonymized) return false;
      return true;
    });
  };

  const comparison = useMemo(() => {
    if (!cohortA || !cohortB) return null;
    const cA = cohorts.find((c) => c.id === cohortA);
    const cB = cohorts.find((c) => c.id === cohortB);
    if (!cA || !cB) return null;

    const sharesA = filterShares(cA.filters);
    const sharesB = filterShares(cB.filters);

    const diseaseDist = (shares: any[]) => shares.reduce((acc, s) => {
      const cat = s.disease_category || "General";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDist = (shares: any[]) => shares.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      nameA: cA.name, nameB: cB.name,
      sizeA: sharesA.length, sizeB: sharesB.length,
      anonA: sharesA.filter((s) => s.is_anonymized).length,
      anonB: sharesB.filter((s) => s.is_anonymized).length,
      diseaseA: diseaseDist(sharesA), diseaseB: diseaseDist(sharesB),
      statusA: statusDist(sharesA), statusB: statusDist(sharesB),
    };
  }, [cohortA, cohortB, cohorts, researcherShares]);

  const allDiseases = useMemo(() => {
    if (!comparison) return [];
    const keys = new Set([...Object.keys(comparison.diseaseA), ...Object.keys(comparison.diseaseB)]);
    return Array.from(keys).map((name) => ({
      name, [comparison.nameA]: comparison.diseaseA[name] || 0, [comparison.nameB]: comparison.diseaseB[name] || 0,
    }));
  }, [comparison]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GitCompareArrows className="h-8 w-8 text-primary" />
          Cohort Comparison
        </h1>
        <p className="text-muted-foreground">Compare two saved cohorts side-by-side</p>
      </div>

      {cohortsLoading ? (
        <Card><CardContent className="py-12 flex justify-center"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
      ) : cohorts.length < 2 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <GitCompareArrows className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Need at least 2 saved cohorts</h3>
            <p className="text-muted-foreground text-sm">Save cohort presets in the Cohort Builder first.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cohort A</label>
              <Select value={cohortA} onValueChange={setCohortA}>
                <SelectTrigger>
                  <span className="truncate">
                    {cohortA ? cohorts.find((c) => c.id === cohortA)?.name || cohortA : "Select cohort..."}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {cohorts.filter((c) => c.id !== cohortB).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cohort B</label>
              <Select value={cohortB} onValueChange={setCohortB}>
                <SelectTrigger>
                  <span className="truncate">
                    {cohortB ? cohorts.find((c) => c.id === cohortB)?.name || cohortB : "Select cohort..."}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {cohorts.filter((c) => c.id !== cohortA).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {comparison && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{comparison.nameA}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="text-sm">Sample Size: <Badge variant="secondary">{comparison.sizeA}</Badge></div>
                    <div className="text-sm">Anonymized: {comparison.anonA} ({comparison.sizeA ? Math.round((comparison.anonA / comparison.sizeA) * 100) : 0}%)</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{comparison.nameB}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="text-sm">Sample Size: <Badge variant="secondary">{comparison.sizeB}</Badge></div>
                    <div className="text-sm">Anonymized: {comparison.anonB} ({comparison.sizeB ? Math.round((comparison.anonB / comparison.sizeB) * 100) : 0}%)</div>
                  </CardContent>
                </Card>
              </div>

              {chartsLoading || !recharts ? (
                <ChartSkeleton height={300} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Disease Distribution Comparison</CardTitle>
                    <CardDescription>Side-by-side disease category breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <recharts.ResponsiveContainer width="100%" height={300}>
                      <recharts.BarChart data={allDiseases}>
                        <recharts.CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <recharts.XAxis dataKey="name" className="text-xs" />
                        <recharts.YAxis allowDecimals={false} />
                        <recharts.Tooltip />
                        <recharts.Legend />
                        <recharts.Bar dataKey={comparison.nameA} fill={COLORS_A[0]} radius={[4, 4, 0, 0]} />
                        <recharts.Bar dataKey={comparison.nameB} fill={COLORS_B[0]} radius={[4, 4, 0, 0]} />
                      </recharts.BarChart>
                    </recharts.ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CohortComparisonPage;
