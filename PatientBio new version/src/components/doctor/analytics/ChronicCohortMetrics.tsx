import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useChronicCarePlans } from "@/hooks/useChronicCarePlans";
import {
  ChronicCondition,
  CONDITION_COLORS,
  CONDITION_LABELS,
} from "@/constants/chronicCareTemplates";
import { Heart, Activity, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PIE_COLORS = ["#3b82f6", "#ef4444", "#14b8a6", "#f59e0b", "#a855f7", "#f97316", "#6b7280"];

export function ChronicCohortMetrics() {
  const { data: allPlans } = useChronicCarePlans();

  const metrics = useMemo(() => {
    if (!allPlans?.length) return null;

    const conditionCounts: Record<string, number> = {};
    let totalMilestones = 0;
    let completedMilestones = 0;
    let activePlans = 0;

    allPlans.forEach((plan) => {
      const label = CONDITION_LABELS[plan.condition_type] || plan.condition_type;
      conditionCounts[label] = (conditionCounts[label] || 0) + 1;

      if (plan.status === "active") {
        activePlans++;
        plan.milestones.forEach((ms) => {
          totalMilestones++;
          if (ms.completed) completedMilestones++;
        });
      }
    });

    const pieData = Object.entries(conditionCounts).map(([name, value]) => ({ name, value }));
    const adherenceRate = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    return { pieData, activePlans, adherenceRate, totalPlans: allPlans.length };
  }, [allPlans]);

  if (!metrics || !metrics.totalPlans) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-500" />
          Chronic Care Cohort
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{metrics.totalPlans}</p>
            <p className="text-[10px] text-muted-foreground">Total Plans</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{metrics.activePlans}</p>
            <p className="text-[10px] text-muted-foreground">Active</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{metrics.adherenceRate}%</p>
            <p className="text-[10px] text-muted-foreground">Adherence</p>
          </div>
        </div>

        {metrics.pieData.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {metrics.pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {metrics.pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span>{entry.name}</span>
                  </div>
                  <span className="font-medium">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
