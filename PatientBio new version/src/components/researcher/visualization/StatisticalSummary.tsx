import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRechartsComponents, ChartSkeleton } from "@/components/shared/LazyChart";
import { DistributionCharts } from "./DistributionCharts";
import { FileDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface StatisticalSummaryProps {
  patientData: any[];
  shares: any[];
}

interface StatData {
  variable: string;
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
}

const NUMERIC_VARIABLES = [
  { value: "age", label: "Age" },
  { value: "blood_pressure_systolic", label: "BP Systolic" },
  { value: "blood_pressure_diastolic", label: "BP Diastolic" },
  { value: "weight", label: "Weight" },
  { value: "height", label: "Height" },
];

export const StatisticalSummary = ({ patientData, shares }: StatisticalSummaryProps) => {
  const [subTab, setSubTab] = useState("summary");
  const { components: recharts, isLoading: rechartsLoading } = useRechartsComponents();

  const calculateStats = (variable: string): StatData | null => {
    const values = patientData
      .map((p) => parseFloat(p[variable]))
      .filter((v) => !isNaN(v));

    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const median = values.length % 2 === 0
      ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
      : sorted[Math.floor(values.length / 2)];
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { variable, count: values.length, mean, median, stdDev, min: Math.min(...values), max: Math.max(...values) };
  };

  const stats = NUMERIC_VARIABLES.map((v) => calculateStats(v.value)).filter((s) => s !== null) as StatData[];

  const getCategoryStats = () => {
    const diseaseCount: Record<string, number> = {};
    shares.forEach((s) => {
      const cat = s.disease_category || "General";
      diseaseCount[cat] = (diseaseCount[cat] || 0) + 1;
    });
    const genderCount: Record<string, number> = {};
    patientData.forEach((p) => {
      const g = p.gender || "Unknown";
      genderCount[g] = (genderCount[g] || 0) + 1;
    });
    return { diseaseCount, genderCount };
  };

  const { diseaseCount, genderCount } = getCategoryStats();

  const diseaseChartData = Object.entries(diseaseCount).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "),
    value,
  }));

  const genderChartData = Object.entries(genderCount).map(([name, value]) => ({
    name,
    value,
  }));

  const handleExportCSV = () => {
    const header = "Variable,Count,Mean,Median,StdDev,Min,Max\n";
    const rows = stats.map((s) =>
      `"${s.variable}",${s.count},${s.mean.toFixed(2)},${s.median.toFixed(2)},${s.stdDev.toFixed(2)},${s.min.toFixed(2)},${s.max.toFixed(2)}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `statistics-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "CSV exported" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={subTab} onValueChange={setSubTab}>
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="distributions">Distributions</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <FileDown className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      {subTab === "summary" ? (
        <>
          {/* Numeric Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <Card key={stat.variable}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium capitalize">
                    {stat.variable.replace(/_/g, " ")}
                  </CardTitle>
                  <CardDescription>N = {stat.count}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mean</span>
                    <span className="font-semibold">{stat.mean.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Median</span>
                    <span className="font-semibold">{stat.median.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Std Dev</span>
                    <span className="font-semibold">{stat.stdDev.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="text-muted-foreground">Min</span>
                    <span className="font-semibold">{stat.min.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max</span>
                    <span className="font-semibold">{stat.max.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Categorical Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Disease Category Distribution</CardTitle>
                <CardDescription>Breakdown by disease category</CardDescription>
              </CardHeader>
              <CardContent>
                {rechartsLoading || !recharts ? (
                  <ChartSkeleton height={300} />
                ) : diseaseChartData.length > 0 ? (
                  <recharts.ResponsiveContainer width="100%" height={300}>
                    <recharts.BarChart data={diseaseChartData}>
                      <recharts.CartesianGrid strokeDasharray="3 3" />
                      <recharts.XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <recharts.YAxis />
                      <recharts.Tooltip />
                      <recharts.Bar dataKey="value" fill="hsl(var(--primary))" />
                    </recharts.BarChart>
                  </recharts.ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gender Distribution</CardTitle>
                <CardDescription>Breakdown by gender</CardDescription>
              </CardHeader>
              <CardContent>
                {rechartsLoading || !recharts ? (
                  <ChartSkeleton height={300} />
                ) : genderChartData.length > 0 ? (
                  <recharts.ResponsiveContainer width="100%" height={300}>
                    <recharts.BarChart data={genderChartData}>
                      <recharts.CartesianGrid strokeDasharray="3 3" />
                      <recharts.XAxis dataKey="name" />
                      <recharts.YAxis />
                      <recharts.Tooltip />
                      <recharts.Bar dataKey="value" fill="hsl(var(--chart-2))" />
                    </recharts.BarChart>
                  </recharts.ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Cohort Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Patients</p>
                <p className="text-2xl font-bold">{patientData.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Shares</p>
                <p className="text-2xl font-bold">{shares.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Disease Categories</p>
                <p className="text-2xl font-bold">{Object.keys(diseaseCount).length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Genders</p>
                <p className="text-2xl font-bold">{Object.keys(genderCount).length}</p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <DistributionCharts patientData={patientData} variables={NUMERIC_VARIABLES} />
      )}
    </div>
  );
};
