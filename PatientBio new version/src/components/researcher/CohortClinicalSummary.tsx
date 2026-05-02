import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Heart, Pill, AlertTriangle, Stethoscope, BarChart3, Download } from "lucide-react";
import { LazyPDFButton, type PDFContentItem } from "@/components/shared/LazyPDFExport";

interface CohortSummary {
  totalPatients: number;
  topDiagnoses: Array<{ name: string; count: number }>;
  icd10Distribution: Array<{ code: string; count: number }>;
  comorbidityPrevalence: Array<{ name: string; count: number; rate: number }>;
  avgComorbidityBurden: number;
  treatmentDistribution: Array<{ type: string; count: number }>;
  abnormalLabRate: number;
  bloodPressure: { avgSystolic: number | null; avgDiastolic: number | null; sampleSize: number };
  bmi: { average: number | null; sampleSize: number };
}

function buildSummaryPDF(summary: CohortSummary) {
  const content: PDFContentItem[] = [
    { type: 'heading', text: 'Vitals Overview', level: 2 },
    { type: 'keyValue', data: {
      'Avg Blood Pressure': summary.bloodPressure.avgSystolic
        ? `${summary.bloodPressure.avgSystolic}/${summary.bloodPressure.avgDiastolic} mmHg (n=${summary.bloodPressure.sampleSize})`
        : 'N/A',
      'Avg BMI': summary.bmi.average ? `${summary.bmi.average} (n=${summary.bmi.sampleSize})` : 'N/A',
      'Abnormal Lab Rate': `${summary.abnormalLabRate}%`,
      'Avg Comorbidity Burden': String(summary.avgComorbidityBurden),
    }},
    { type: 'divider' },
    { type: 'heading', text: 'Top Diagnoses', level: 2 },
    { type: 'table', headers: ['Diagnosis', 'Count'], rows: summary.topDiagnoses.map(d => [d.name, String(d.count)]) },
    { type: 'divider' },
    { type: 'heading', text: 'ICD-10 Distribution', level: 2 },
    { type: 'table', headers: ['ICD-10 Code', 'Count'], rows: summary.icd10Distribution.map(d => [d.code, String(d.count)]) },
    { type: 'divider' },
    { type: 'heading', text: 'Treatment Distribution', level: 2 },
    { type: 'table', headers: ['Treatment', 'Count'], rows: summary.treatmentDistribution.map(t => [t.type, String(t.count)]) },
    { type: 'divider' },
    { type: 'heading', text: 'Comorbidity Prevalence', level: 2 },
    { type: 'table', headers: ['Condition', 'Count', 'Rate (%)'], rows: summary.comorbidityPrevalence.map(c => [c.name, String(c.count), `${c.rate}%`]) },
  ];

  return {
    filename: `cohort-clinical-summary-${new Date().toISOString().split('T')[0]}`,
    title: 'Cohort Clinical Summary Report',
    subtitle: `Aggregate statistics across ${summary.totalPatients} shared patients`,
    content,
  };
}

const CohortClinicalSummary = () => {
  const { user } = useAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["cohort-clinical-summary", user?.id],
    queryFn: async (): Promise<CohortSummary | null> => {
      const { data, error } = await supabase.functions.invoke("aggregate-cohort-clinical");
      if (error) {
        console.error("Error fetching cohort summary:", error);
        return null;
      }
      return data?.summary || null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.totalPatients === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Cohort Clinical Summary
          </CardTitle>
          <CardDescription>
            Aggregate clinical statistics across {summary.totalPatients} shared patients
          </CardDescription>
        </div>
        <LazyPDFButton
          options={buildSummaryPDF(summary)}
          variant="outline"
          size="sm"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Summary
        </LazyPDFButton>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vitals */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Heart className="h-4 w-4 text-destructive" />
              Vitals
            </div>
            {summary.bloodPressure.avgSystolic && (
              <p className="text-sm">
                Avg BP: <span className="font-semibold">{summary.bloodPressure.avgSystolic}/{summary.bloodPressure.avgDiastolic}</span>
                <span className="text-muted-foreground text-xs ml-1">(n={summary.bloodPressure.sampleSize})</span>
              </p>
            )}
            {summary.bmi.average && (
              <p className="text-sm">
                Avg BMI: <span className="font-semibold">{summary.bmi.average}</span>
                <span className="text-muted-foreground text-xs ml-1">(n={summary.bmi.sampleSize})</span>
              </p>
            )}
          </div>

          {/* Lab abnormality rate */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Lab Results
            </div>
            <p className="text-sm">
              Abnormal rate: <span className="font-semibold">{summary.abnormalLabRate}%</span>
            </p>
            <p className="text-sm">
              Avg comorbidities: <span className="font-semibold">{summary.avgComorbidityBurden}</span>
            </p>
          </div>

          {/* Top Diagnoses */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Stethoscope className="h-4 w-4 text-primary" />
              Top Diagnoses
            </div>
            <div className="flex flex-wrap gap-1">
              {summary.topDiagnoses.slice(0, 4).map((d) => (
                <Badge key={d.name} variant="secondary" className="text-[10px]">
                  {d.name} ({d.count})
                </Badge>
              ))}
            </div>
          </div>

          {/* Treatment Distribution */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Pill className="h-4 w-4 text-primary" />
              Treatments
            </div>
            <div className="flex flex-wrap gap-1">
              {summary.treatmentDistribution.slice(0, 4).map((t) => (
                <Badge key={t.type} variant="outline" className="text-[10px]">
                  {t.type} ({t.count})
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Comorbidity prevalence */}
        {summary.comorbidityPrevalence.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Comorbidity Prevalence
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {summary.comorbidityPrevalence.slice(0, 5).map((c) => (
                <div key={c.name} className="text-center p-2 rounded border">
                  <p className="text-xs text-muted-foreground truncate" title={c.name}>{c.name}</p>
                  <p className="text-lg font-bold text-primary">{c.rate}%</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CohortClinicalSummary;
