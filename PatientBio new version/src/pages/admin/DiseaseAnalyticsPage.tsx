import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Stethoscope, FileText, TrendingUp, Activity, Download } from "lucide-react";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { DateRangeFilter, useDateRangeFilter } from "@/components/admin/DateRangeFilter";
import { useAdminAnalyticsExport } from "@/hooks/useAdminAnalyticsExport";

const DISEASE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  cancer: "Cancer",
  covid19: "COVID-19",
  diabetes: "Diabetes",
  heart_disease: "Heart Disease",
  other: "Other",
};

export default function DiseaseAnalyticsPage() {
  const { dateRange, setDateRange } = useDateRangeFilter("30d");
  const { exportCSV, isExporting } = useAdminAnalyticsExport();
  // Fetch health records for disease distribution
  const { data: healthRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ["admin-health-records-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_records")
        .select("id, disease_category, category, uploaded_at")
        .limit(1000);

      if (error) throw error;
      return data;
    },
  });

  // Fetch prescriptions for additional disease data
  const { data: prescriptions, isLoading: prescriptionsLoading } = useQuery({
    queryKey: ["admin-prescriptions-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, diagnosis, created_at")
        .limit(1000);

      if (error) throw error;
      return data;
    },
  });

   // Fetch pathologist shares by disease
  const { data: pathologistShares, isLoading: pathologistLoading } = useQuery({
    queryKey: ["admin-pathologist-disease-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_pathologist_shares")
        .select("id, disease_category, shared_at")
        .limit(1000);

      if (error) throw error;
      return data;
    },
  });

  const isLoading = recordsLoading || prescriptionsLoading || pathologistLoading;

  // Process disease distribution from health records
  const diseaseDistribution = healthRecords
    ? (() => {
        const counts: Record<string, number> = {};
        healthRecords.forEach((r) => {
          const category = r.disease_category || "general";
          counts[category] = (counts[category] || 0) + 1;
        });
        return Object.entries(counts).map(([key, value]) => ({
          name: CATEGORY_LABELS[key] || key,
          value,
          key,
        }));
      })()
    : [];

  // Process record category distribution
  const recordCategoryDistribution = healthRecords
    ? (() => {
        const counts: Record<string, number> = {};
        healthRecords.forEach((r) => {
          const category = r.category || "other";
          counts[category] = (counts[category] || 0) + 1;
        });
        const categoryLabels: Record<string, string> = {
          prescription: "Prescriptions",
          lab_result: "Lab Results",
          imaging: "Imaging",
          vaccination: "Vaccinations",
          other: "Other",
        };
        return Object.entries(counts).map(([key, value]) => ({
          name: categoryLabels[key] || key,
          value,
        }));
      })()
    : [];

  // Process pathologist disease distribution
  const pathologistDiseaseDistribution = pathologistShares
    ? (() => {
        const counts: Record<string, number> = {};
        pathologistShares.forEach((s) => {
          const category = s.disease_category || "general";
          counts[category] = (counts[category] || 0) + 1;
        });
        return Object.entries(counts).map(([key, value]) => ({
          name: CATEGORY_LABELS[key] || key,
          value,
        }));
      })()
    : [];

  // Process uploads over time by disease
  const uploadsOverTime = healthRecords
    ? (() => {
        const now = new Date();
        const startDate = subDays(now, 29);
        const days = eachDayOfInterval({ start: startDate, end: now });

        const countsByDay = new Map<string, Record<string, number>>();

        healthRecords.forEach((r) => {
          const day = format(startOfDay(new Date(r.uploaded_at)), "yyyy-MM-dd");
          const category = r.disease_category || "general";
          if (!countsByDay.has(day)) {
            countsByDay.set(day, {});
          }
          const dayCounts = countsByDay.get(day)!;
          dayCounts[category] = (dayCounts[category] || 0) + 1;
        });

        return days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayCounts = countsByDay.get(dayKey) || {};
          return {
            date: format(day, "MMM d"),
            ...dayCounts,
            total: Object.values(dayCounts).reduce((a, b) => a + b, 0),
          };
        });
      })()
    : [];

  // Stats
  const totalRecords = healthRecords?.length || 0;
  const totalPrescriptions = prescriptions?.length || 0;
  const totalPathologistShares = pathologistShares?.length || 0;

  const chartConfig = {
    value: { label: "Count", color: "hsl(var(--primary))" },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Disease Analytics</h1>
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Disease Analytics</h1>
          <p className="text-muted-foreground">Health data distribution and trends by disease category</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting}
            onClick={() => exportCSV({
              title: "Disease Analytics",
              headers: ["Category", "Records", "Percentage"],
              rows: diseaseDistribution.map((d) => [d.name, String(d.value), `${((d.value / totalRecords) * 100).toFixed(1)}%`]),
            })}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords}</div>
            <p className="text-xs text-muted-foreground">Health records uploaded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPrescriptions}</div>
            <p className="text-xs text-muted-foreground">Digital prescriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lab Shares</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPathologistShares}</div>
            <p className="text-xs text-muted-foreground">Pathologist referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{diseaseDistribution.length}</div>
            <p className="text-xs text-muted-foreground">Disease categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Disease Category Distribution
            </CardTitle>
            <CardDescription>Health records by disease category</CardDescription>
          </CardHeader>
          <CardContent>
            {diseaseDistribution.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={diseaseDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {diseaseDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={DISEASE_COLORS[index % DISEASE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No disease category data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Record Type Distribution
            </CardTitle>
            <CardDescription>Health records by type (prescription, lab, imaging, etc.)</CardDescription>
          </CardHeader>
          <CardContent>
            {recordCategoryDistribution.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recordCategoryDistribution} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" name="Records" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No record type data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Pathologist Referrals by Disease
            </CardTitle>
            <CardDescription>Lab testing requests by disease category</CardDescription>
          </CardHeader>
          <CardContent>
            {pathologistDiseaseDistribution.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pathologistDiseaseDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" name="Referrals" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No pathologist referral data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Record Uploads Over Time
            </CardTitle>
            <CardDescription>Health record uploads over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {uploadsOverTime.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={uploadsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" name="Uploads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No upload data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Disease Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Disease Category Details</CardTitle>
          <CardDescription>Breakdown of health records by disease category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {diseaseDistribution.map((category, index) => (
              <div
                key={category.key}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: DISEASE_COLORS[index % DISEASE_COLORS.length] }}
                  />
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {((category.value / totalRecords) * 100).toFixed(1)}% of records
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{category.value}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
