import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, startOfMonth, parseISO } from "date-fns";

interface PoolEntry {
  disease_categories: string[];
  contributed_at: string;
}

interface PoolTemporalTrendsProps {
  poolData: PoolEntry[];
}

const TREND_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export const PoolTemporalTrends = ({ poolData }: PoolTemporalTrendsProps) => {
  const { volumeData, diseaseData, topDiseases } = useMemo(() => {
    if (poolData.length === 0) return { volumeData: [], diseaseData: [], topDiseases: [] };

    // Group by month
    const monthBuckets: Record<string, number> = {};
    const diseaseBuckets: Record<string, Record<string, number>> = {};
    const diseaseTotal: Record<string, number> = {};

    poolData.forEach(entry => {
      const monthKey = format(startOfMonth(parseISO(entry.contributed_at)), "yyyy-MM");
      monthBuckets[monthKey] = (monthBuckets[monthKey] || 0) + 1;

      entry.disease_categories.forEach(dc => {
        diseaseTotal[dc] = (diseaseTotal[dc] || 0) + 1;
        if (!diseaseBuckets[monthKey]) diseaseBuckets[monthKey] = {};
        diseaseBuckets[monthKey][dc] = (diseaseBuckets[monthKey][dc] || 0) + 1;
      });
    });

    const sortedMonths = Object.keys(monthBuckets).sort();
    const vol = sortedMonths.map(m => ({ month: format(parseISO(m + "-01"), "MMM yy"), count: monthBuckets[m] }));

    const top = Object.entries(diseaseTotal).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
    const dData = sortedMonths.map(m => {
      const point: Record<string, string | number> = { month: format(parseISO(m + "-01"), "MMM yy") };
      top.forEach(d => { point[d] = diseaseBuckets[m]?.[d] || 0; });
      return point;
    });

    return { volumeData: vol, diseaseData: dData, topDiseases: top };
  }, [poolData]);

  if (volumeData.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Temporal Trends</CardTitle>
          <CardDescription>Requires contributions across multiple months</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground text-sm">Not enough temporal data (need 2+ months)</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Temporal Trends</CardTitle>
        <CardDescription>Contribution volume and disease prevalence over time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contribution Volume */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Contribution Volume</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={volumeData}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Contributions" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Disease Prevalence */}
        {topDiseases.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Disease Prevalence Trends</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={diseaseData}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {topDiseases.map((d, i) => (
                  <Line key={d} type="monotone" dataKey={d} stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={1.5} dot={{ r: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
