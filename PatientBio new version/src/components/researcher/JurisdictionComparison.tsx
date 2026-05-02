import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PoolEntry {
  disease_categories: string[];
  age_range: string | null;
  gender: string | null;
  source_jurisdiction: string;
}

interface JurisdictionComparisonProps {
  poolData: PoolEntry[];
}

const JURISDICTION_LABELS: Record<string, string> = {
  BD: "Bangladesh", IN: "India", US: "United States", EU: "European Union", UK: "United Kingdom",
  CA: "Canada", AU: "Australia", JP: "Japan", SG: "Singapore",
};

const BAR_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export const JurisdictionComparison = ({ poolData }: JurisdictionComparisonProps) => {
  const { jurisdictions, diseaseComparison, demographicComparison } = useMemo(() => {
    const jMap: Record<string, PoolEntry[]> = {};
    poolData.forEach(d => {
      const j = d.source_jurisdiction;
      if (!jMap[j]) jMap[j] = [];
      jMap[j].push(d);
    });

    const jKeys = Object.keys(jMap).sort((a, b) => jMap[b].length - jMap[a].length).slice(0, 6);
    if (jKeys.length < 2) return { jurisdictions: jKeys, diseaseComparison: [], demographicComparison: [] };

    // Top diseases across all jurisdictions
    const allDiseases: Record<string, number> = {};
    poolData.forEach(d => d.disease_categories.forEach(dc => { allDiseases[dc] = (allDiseases[dc] || 0) + 1; }));
    const topDiseases = Object.entries(allDiseases).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n);

    // Disease comparison: each disease as a row, jurisdictions as grouped bars
    const dComp = topDiseases.map(disease => {
      const point: Record<string, string | number> = { disease };
      jKeys.forEach(j => {
        const jTotal = jMap[j].length || 1;
        const count = jMap[j].filter(d => d.disease_categories.includes(disease)).length;
        point[JURISDICTION_LABELS[j] || j] = Math.round((count / jTotal) * 100);
      });
      return point;
    });

    // Demographic comparison: gender split per jurisdiction
    const demComp = jKeys.map(j => {
      const entries = jMap[j];
      const total = entries.length || 1;
      const male = entries.filter(e => e.gender === "male").length;
      const female = entries.filter(e => e.gender === "female").length;
      const other = total - male - female;
      return {
        jurisdiction: JURISDICTION_LABELS[j] || j,
        Male: Math.round((male / total) * 100),
        Female: Math.round((female / total) * 100),
        Other: Math.round((other / total) * 100),
        total,
      };
    });

    return { jurisdictions: jKeys, diseaseComparison: dComp, demographicComparison: demComp };
  }, [poolData]);

  if (jurisdictions.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jurisdiction Comparison</CardTitle>
          <CardDescription>Requires contributions from 2+ regions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground text-sm">
            Only {jurisdictions.length} jurisdiction{jurisdictions.length !== 1 ? "s" : ""} in the pool
          </p>
        </CardContent>
      </Card>
    );
  }

  const jLabels = jurisdictions.map(j => JURISDICTION_LABELS[j] || j);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Jurisdiction Comparison</CardTitle>
        <CardDescription>Side-by-side disease prevalence and demographics by region</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Disease Prevalence by Jurisdiction */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Disease Prevalence by Region (%)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={diseaseComparison} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="disease" tick={{ fontSize: 10 }} width={80} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {jLabels.map((label, i) => (
                <Bar key={label} dataKey={label} fill={BAR_COLORS[i % BAR_COLORS.length]} radius={[0, 3, 3, 0]} barSize={8} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Demographic Split */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Gender Distribution by Region (%)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={demographicComparison}>
              <XAxis dataKey="jurisdiction" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Male" stackId="a" fill="hsl(var(--primary))" />
              <Bar dataKey="Female" stackId="a" fill="hsl(var(--accent))" />
              <Bar dataKey="Other" stackId="a" fill="hsl(var(--muted-foreground))" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          {jurisdictions.map(j => (
            <Badge key={j} variant="outline" className="text-xs">
              {JURISDICTION_LABELS[j] || j}: {poolData.filter(d => d.source_jurisdiction === j).length} records
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
