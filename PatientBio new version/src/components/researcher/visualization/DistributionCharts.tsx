import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useRechartsComponents, ChartSkeleton } from "@/components/shared/LazyChart";

interface DistributionChartsProps {
  patientData: any[];
  variables: { value: string; label: string }[];
}

function computeBoxPlot(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const median = sorted[Math.floor(n * 0.5)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);
  return { min: sorted[0], q1, median, q3, max: sorted[n - 1], iqr, lowerFence, upperFence, outliers };
}

function buildHistogram(values: number[], bins: number) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / bins || 1;
  const result = Array.from({ length: bins }, (_, i) => ({
    label: `${(min + i * binWidth).toFixed(1)}`,
    count: 0,
  }));
  values.forEach((v) => {
    const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    result[idx].count++;
  });
  return result;
}

export const DistributionCharts = ({ patientData, variables }: DistributionChartsProps) => {
  const [binCount, setBinCount] = useState(10);
  const { components: recharts, isLoading } = useRechartsComponents();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Label className="whitespace-nowrap">Histogram Bins: {binCount}</Label>
        <Slider
          value={[binCount]}
          onValueChange={(v) => setBinCount(v[0])}
          min={5}
          max={30}
          step={1}
          className="w-48"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {variables.map((variable) => {
          const values = patientData
            .map((p) => parseFloat(p[variable.value]))
            .filter((v) => !isNaN(v));
          const histData = buildHistogram(values, binCount);
          const box = computeBoxPlot(values);

          return (
            <Card key={variable.value}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{variable.label} Distribution</CardTitle>
                  {box && box.outliers.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {box.outliers.length} outlier{box.outliers.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <CardDescription>N = {values.length}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Histogram */}
                {isLoading || !recharts ? (
                  <ChartSkeleton height={200} />
                ) : (
                  <recharts.ResponsiveContainer width="100%" height={200}>
                    <recharts.BarChart data={histData}>
                      <recharts.CartesianGrid strokeDasharray="3 3" />
                      <recharts.XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <recharts.YAxis />
                      <recharts.Tooltip />
                      <recharts.Bar dataKey="count" fill="hsl(var(--primary))" />
                    </recharts.BarChart>
                  </recharts.ResponsiveContainer>
                )}

                {/* Box plot summary */}
                {box && (
                  <div className="grid grid-cols-5 gap-2 text-xs text-center">
                    <div>
                      <p className="text-muted-foreground">Min</p>
                      <p className="font-semibold">{box.min.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Q1</p>
                      <p className="font-semibold">{box.q1.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Median</p>
                      <p className="font-bold text-primary">{box.median.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Q3</p>
                      <p className="font-semibold">{box.q3.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max</p>
                      <p className="font-semibold">{box.max.toFixed(1)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
