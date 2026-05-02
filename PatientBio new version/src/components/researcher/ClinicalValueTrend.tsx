import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { useRechartsComponents, ChartSkeleton } from "@/components/shared/LazyChart";

interface ClinicalSnapshot {
  date: string;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  bmi?: number | null;
  [key: string]: unknown;
}

interface ClinicalValueTrendProps {
  snapshots: ClinicalSnapshot[];
  title?: string;
}

interface TrendPoint {
  date: string;
  dateLabel: string;
  bp_systolic?: number;
  bp_diastolic?: number;
  bmi?: number;
  bp_systolic_upper?: number;
  bp_systolic_lower?: number;
  bmi_upper?: number;
  bmi_lower?: number;
}

function computeTrend(snapshots: ClinicalSnapshot[]): TrendPoint[] {
  const sorted = [...snapshots]
    .filter((s) => s.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return sorted.map((s) => {
    const point: TrendPoint = {
      date: s.date,
      dateLabel: new Date(s.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    };
    if (s.bp_systolic != null) {
      point.bp_systolic = s.bp_systolic;
      point.bp_systolic_upper = s.bp_systolic + 8;
      point.bp_systolic_lower = Math.max(0, s.bp_systolic - 8);
    }
    if (s.bp_diastolic != null) {
      point.bp_diastolic = s.bp_diastolic;
    }
    if (s.bmi != null) {
      point.bmi = s.bmi;
      point.bmi_upper = s.bmi + 1.5;
      point.bmi_lower = Math.max(0, s.bmi - 1.5);
    }
    return point;
  });
}

const ClinicalValueTrend = ({ snapshots, title = "Clinical Value Trends" }: ClinicalValueTrendProps) => {
  const trendData = useMemo(() => computeTrend(snapshots), [snapshots]);
  const { components: RC, isLoading: chartsLoading } = useRechartsComponents();

  const hasBP = trendData.some((d) => d.bp_systolic != null);
  const hasBMI = trendData.some((d) => d.bmi != null);

  if (trendData.length < 2 || (!hasBP && !hasBMI)) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>
          {trendData.length} data points
          <span className="ml-2">
            {hasBP && <Badge variant="outline" className="text-[10px] mr-1">BP</Badge>}
            {hasBMI && <Badge variant="outline" className="text-[10px]">BMI</Badge>}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartsLoading || !RC ? (
          <ChartSkeleton height={260} />
        ) : (
          <div className="space-y-4">
            {hasBP && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Blood Pressure (mmHg)</p>
                <RC.ResponsiveContainer width="100%" height={180}>
                  <RC.ComposedChart data={trendData}>
                    <RC.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <RC.XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
                    <RC.YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                    <RC.Tooltip />
                    <RC.Area
                      dataKey="bp_systolic_upper"
                      stroke="none"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.1}
                    />
                    <RC.Area
                      dataKey="bp_systolic_lower"
                      stroke="none"
                      fill="hsl(var(--background))"
                      fillOpacity={1}
                    />
                    <RC.Line
                      type="monotone"
                      dataKey="bp_systolic"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Systolic"
                    />
                    <RC.Line
                      type="monotone"
                      dataKey="bp_diastolic"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Diastolic"
                    />
                    <RC.Legend />
                  </RC.ComposedChart>
                </RC.ResponsiveContainer>
              </div>
            )}

            {hasBMI && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">BMI</p>
                <RC.ResponsiveContainer width="100%" height={160}>
                  <RC.ComposedChart data={trendData}>
                    <RC.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <RC.XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
                    <RC.YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                    <RC.Tooltip />
                    <RC.Area
                      dataKey="bmi_upper"
                      stroke="none"
                      fill="hsl(var(--accent))"
                      fillOpacity={0.15}
                    />
                    <RC.Area
                      dataKey="bmi_lower"
                      stroke="none"
                      fill="hsl(var(--background))"
                      fillOpacity={1}
                    />
                    <RC.Line
                      type="monotone"
                      dataKey="bmi"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="BMI"
                    />
                    <RC.Legend />
                  </RC.ComposedChart>
                </RC.ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClinicalValueTrend;
