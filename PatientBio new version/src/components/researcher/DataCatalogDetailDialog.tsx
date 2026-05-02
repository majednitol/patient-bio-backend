import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, MapPin, Activity, Sparkles, Users } from "lucide-react";
import { useRechartsComponents, ChartSkeleton } from "@/components/shared/LazyChart";
import { tooltipStyle, COLORS } from "@/components/doctor/analytics/AnalyticsChartTypes";

const ALL_DATA_CATEGORIES = ['prescriptions', 'diagnoses', 'vitals', 'lab_results', 'allergies', 'demographics'];

interface PoolEntry {
  id: string;
  contribution_hash: string;
  anonymized_data: Record<string, unknown>;
  data_categories: string[];
  disease_categories: string[];
  age_range: string | null;
  gender: string | null;
  source_jurisdiction: string;
  govt_approval_status: string;
  contributed_at: string;
  quality_score: number | null;
}

interface DataCatalogDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disease: string;
  diseaseItems: PoolEntry[];
  onRequestData: () => void;
}

export const DataCatalogDetailDialog = ({
  open,
  onOpenChange,
  disease,
  diseaseItems,
  onRequestData,
}: DataCatalogDetailDialogProps) => {
  const { components: rc, isLoading: chartsLoading } = useRechartsComponents();

  // Age distribution
  const ageDist = diseaseItems.reduce((acc, d) => {
    const a = d.age_range || "unknown";
    acc[a] = (acc[a] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const ageData = Object.entries(ageDist).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Gender split
  const genderDist = diseaseItems.reduce((acc, d) => {
    const g = d.gender || "unknown";
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const genderData = Object.entries(genderDist).map(([name, value]) => ({ name, value }));

  // Jurisdiction breakdown
  const jurisdictionDist = diseaseItems.reduce((acc, d) => {
    acc[d.source_jurisdiction] = (acc[d.source_jurisdiction] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const jurisdictionData = Object.entries(jurisdictionDist).sort((a, b) => b[1] - a[1]);

  // Quality histogram
  const qualityBuckets = [0, 0, 0, 0, 0]; // 0-20, 20-40, 40-60, 60-80, 80-100
  diseaseItems.forEach((d) => {
    const q = d.quality_score ?? 0;
    const idx = Math.min(Math.floor(q / 20), 4);
    qualityBuckets[idx]++;
  });
  const qualityData = ["0-20", "20-40", "40-60", "60-80", "80-100"].map((name, i) => ({
    name,
    count: qualityBuckets[i],
  }));

  // Data category coverage
  const total = diseaseItems.length || 1;
  const categoryCoverage = ALL_DATA_CATEGORIES.map((cat) => ({
    name: cat.replace(/_/g, " "),
    coverage: Math.round((diseaseItems.filter((d) => d.data_categories.includes(cat)).length / total) * 100),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {disease.replace(/_/g, " ")} — Clinical Depth
          </DialogTitle>
          <DialogDescription>
            {diseaseItems.length} records across {jurisdictionData.length} jurisdictions
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Age Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Age Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {chartsLoading || !rc ? (
                <ChartSkeleton height={180} />
              ) : (
                <rc.ResponsiveContainer width="100%" height={180}>
                  <rc.BarChart data={ageData}>
                    <rc.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <rc.XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <rc.YAxis tick={{ fontSize: 10 }} />
                    <rc.Tooltip contentStyle={tooltipStyle} />
                    <rc.Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </rc.BarChart>
                </rc.ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Gender Split */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Gender Split</CardTitle>
            </CardHeader>
            <CardContent>
              {chartsLoading || !rc ? (
                <ChartSkeleton height={180} />
              ) : (
                <rc.ResponsiveContainer width="100%" height={180}>
                  <rc.PieChart>
                    <rc.Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {genderData.map((_, i) => (
                        <rc.Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </rc.Pie>
                    <rc.Tooltip contentStyle={tooltipStyle} />
                  </rc.PieChart>
                </rc.ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Data Quality */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Quality Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartsLoading || !rc ? (
                <ChartSkeleton height={180} />
              ) : (
                <rc.ResponsiveContainer width="100%" height={180}>
                  <rc.BarChart data={qualityData}>
                    <rc.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <rc.XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <rc.YAxis tick={{ fontSize: 10 }} />
                    <rc.Tooltip contentStyle={tooltipStyle} />
                    <rc.Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </rc.BarChart>
                </rc.ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Data Category Coverage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Data Category Coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categoryCoverage.map((cat) => (
                <div key={cat.name} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{cat.name}</span>
                    <span className="font-medium">{cat.coverage}%</span>
                  </div>
                  <Progress value={cat.coverage} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Jurisdictions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Jurisdictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {jurisdictionData.map(([j, cnt]) => (
                <Badge key={j} variant="outline" className="gap-1">
                  {j} <span className="text-muted-foreground font-normal">({cnt})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action */}
        <div className="flex justify-end pt-2">
          <Button onClick={onRequestData} className="gap-1.5">
            <Radio className="h-4 w-4" /> Request This Data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
