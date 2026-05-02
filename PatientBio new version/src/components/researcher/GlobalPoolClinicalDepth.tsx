import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Pill, AlertTriangle, Activity } from "lucide-react";
import { useRechartsComponents, ChartSkeleton } from "@/components/shared/LazyChart";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

interface PoolEntry {
  anonymized_data: Record<string, unknown>;
}

interface GlobalPoolClinicalDepthProps {
  poolData: PoolEntry[];
}

interface ClinicalDepthData {
  icd10Distribution: Array<{ code: string; count: number }>;
  treatmentDistribution: Array<{ type: string; count: number }>;
  abnormalLabRate: number;
  avgComorbidityBurden: number;
  totalWithClinical: number;
}

function extractClinicalDepth(poolData: PoolEntry[]): ClinicalDepthData {
  const icd10Map: Record<string, number> = {};
  const treatmentMap: Record<string, number> = {};
  let abnormalCount = 0;
  let totalComorbidities = 0;
  let comorbidityEntries = 0;
  let labEntries = 0;
  let totalWithClinical = 0;

  for (const entry of poolData) {
    const ad = entry.anonymized_data as Record<string, any> | null;
    if (!ad) continue;

    let hasClinical = false;

    // Extract ICD-10 codes
    const icd10 = ad.icd10_codes || ad.icd10 || ad.diagnoses_icd10;
    if (Array.isArray(icd10)) {
      hasClinical = true;
      for (const code of icd10) {
        const c = typeof code === "string" ? code : code?.code;
        if (c) icd10Map[c] = (icd10Map[c] || 0) + 1;
      }
    }
    // Also check comorbidities icd10_mappings
    const comorbidities = ad.comorbidities;
    if (comorbidities && typeof comorbidities === "object") {
      const mappings = (comorbidities as any).icd10_mappings;
      if (mappings && typeof mappings === "object") {
        hasClinical = true;
        for (const [, code] of Object.entries(mappings)) {
          if (typeof code === "string") icd10Map[code] = (icd10Map[code] || 0) + 1;
        }
      }
      const list = (comorbidities as any).comorbidity_list;
      if (Array.isArray(list)) {
        totalComorbidities += list.length;
        comorbidityEntries++;
      }
    }

    // Extract treatments
    const treatments = ad.treatments || ad.treatment_modalities;
    if (treatments && typeof treatments === "object") {
      hasClinical = true;
      const types = Array.isArray(treatments)
        ? treatments
        : (treatments as any).treatment_types || [];
      for (const t of types) {
        const name = typeof t === "string" ? t : t?.type;
        if (name) treatmentMap[name] = (treatmentMap[name] || 0) + 1;
      }
    }

    // Check abnormal labs
    const investigations = ad.investigations || ad.lab_results;
    if (investigations && typeof investigations === "object") {
      labEntries++;
      hasClinical = true;
      if ((investigations as any).has_abnormal_values === true) {
        abnormalCount++;
      }
    }

    if (hasClinical) totalWithClinical++;
  }

  return {
    icd10Distribution: Object.entries(icd10Map)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
    treatmentDistribution: Object.entries(treatmentMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    abnormalLabRate: labEntries > 0 ? Math.round((abnormalCount / labEntries) * 100) : 0,
    avgComorbidityBurden: comorbidityEntries > 0 ? Math.round((totalComorbidities / comorbidityEntries) * 10) / 10 : 0,
    totalWithClinical,
  };
}

const GlobalPoolClinicalDepth = ({ poolData }: GlobalPoolClinicalDepthProps) => {
  const data = useMemo(() => extractClinicalDepth(poolData), [poolData]);
  const { components: RC, isLoading: chartsLoading } = useRechartsComponents();

  if (data.totalWithClinical === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          Clinical Data Overview
        </CardTitle>
        <CardDescription>
          Structured clinical data extracted from {data.totalWithClinical} anonymized contributions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stat cards row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold">{data.abnormalLabRate}%</p>
            <p className="text-xs text-muted-foreground">Abnormal Lab Rate</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Activity className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{data.avgComorbidityBurden}</p>
            <p className="text-xs text-muted-foreground">Avg Comorbidities</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Stethoscope className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{data.icd10Distribution.length}</p>
            <p className="text-xs text-muted-foreground">Unique ICD-10 Codes</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Pill className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{data.treatmentDistribution.length}</p>
            <p className="text-xs text-muted-foreground">Treatment Modalities</p>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ICD-10 bar chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">ICD-10 Code Frequency</h4>
            {chartsLoading || !RC ? (
              <ChartSkeleton height={220} />
            ) : data.icd10Distribution.length > 0 ? (
              <RC.ResponsiveContainer width="100%" height={220}>
                <RC.BarChart data={data.icd10Distribution} layout="vertical">
                  <RC.XAxis type="number" tick={{ fontSize: 10 }} />
                  <RC.YAxis dataKey="code" type="category" tick={{ fontSize: 10 }} width={70} />
                  <RC.Tooltip />
                  <RC.Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </RC.BarChart>
              </RC.ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No ICD-10 data available</p>
            )}
          </div>

          {/* Treatment pie chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Treatment Modality Breakdown</h4>
            {chartsLoading || !RC ? (
              <ChartSkeleton height={220} />
            ) : data.treatmentDistribution.length > 0 ? (
              <RC.ResponsiveContainer width="100%" height={220}>
                <RC.PieChart>
                  <RC.Pie
                    data={data.treatmentDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    nameKey="type"
                    label={({ type, percent }: any) => `${type} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.treatmentDistribution.map((_, i) => (
                      <RC.Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </RC.Pie>
                  <RC.Tooltip />
                </RC.PieChart>
              </RC.ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No treatment data available</p>
            )}
          </div>
        </div>

        {/* Top ICD-10 badges */}
        {data.icd10Distribution.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Top ICD-10 Codes</h4>
            <div className="flex flex-wrap gap-1.5">
              {data.icd10Distribution.slice(0, 10).map((d) => (
                <Badge key={d.code} variant="secondary" className="text-xs">
                  {d.code} ({d.count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GlobalPoolClinicalDepth;
