import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface TestPopularityChartProps {
  reports: Array<{
    hospital_order?: {
      tests?: Array<{ name: string; price?: number }>;
    } | null;
  }>;
}

const CHART_COLORS = [
  "hsl(173, 58%, 39%)",  // diagnostic-primary (teal)
  "hsl(187, 47%, 55%)",  // diagnostic-secondary (cyan)
  "hsl(142, 52%, 45%)",  // diagnostic-accent (green)
  "hsl(38, 92%, 50%)",   // amber
  "hsl(199, 89%, 48%)",  // blue
  "hsl(316, 70%, 58%)",  // pink
];

export function TestPopularityChart({ reports }: TestPopularityChartProps) {
  const testData = useMemo(() => {
    const testCounts: Record<string, number> = {};

    reports.forEach((report) => {
      const tests = report.hospital_order?.tests || [];
      tests.forEach((test) => {
        const testName = test.name || "Unknown";
        testCounts[testName] = (testCounts[testName] || 0) + 1;
      });
    });

    return Object.entries(testCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 tests
  }, [reports]);

  if (testData.length === 0) {
    return (
      <Card className="diagnostic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
            Test Popularity
          </CardTitle>
          <CardDescription>Most frequently ordered tests</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground">
          No test data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="diagnostic-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
          Test Popularity
        </CardTitle>
        <CardDescription>Top 10 most frequently ordered tests</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={testData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value) => [`${value} orders`, "Count"]}
            />
            <Bar dataKey="count" fill="hsl(173, 58%, 39%)" radius={[8, 8, 0, 0]}>
              {testData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
