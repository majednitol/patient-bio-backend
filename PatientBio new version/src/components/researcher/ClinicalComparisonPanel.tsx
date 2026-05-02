import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Download, GitCompareArrows, Loader2, Users } from "lucide-react";

interface ShareRecord {
  id: string;
  patient_id: string;
  is_anonymized: boolean;
  disease_category: string | null;
  status: string;
}

interface PatientClinicalData {
  shareId: string;
  label: string;
  diagnosis: string;
  comorbidityCount: number;
  comorbidities: string[];
  treatments: string[];
  hasAbnormalLabs: boolean;
  bpRange: string;
  bmi: string;
  careSpecialties: string[];
  complications: string[];
  activeMeds: number;
}

interface ClinicalComparisonPanelProps {
  shares: ShareRecord[];
}

const ClinicalComparisonPanel = ({ shares }: ClinicalComparisonPanelProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<PatientClinicalData[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 10 ? [...prev, id] : prev
    );
  };

  const fetchComparison = async () => {
    if (selectedIds.length < 2) {
      toast({ title: "Select at least 2 patients", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.all(
        selectedIds.map(async (shareId) => {
          const { data } = await supabase.functions.invoke("get-patient-data-for-researcher", {
            body: { share_id: shareId },
          });
          const share = shares.find((s) => s.id === shareId)!;
          const label = share.is_anonymized
            ? `ANON-${share.patient_id.substring(0, 8).toUpperCase()}`
            : share.patient_id.substring(0, 8).toUpperCase();

          const cr = data?.clinicalRecords;
          const rx = data?.prescriptions || [];

          return {
            shareId,
            label,
            diagnosis: cr?.background?.primary_diagnosis || "—",
            comorbidityCount: cr?.comorbidities?.comorbidity_list?.length || 0,
            comorbidities: cr?.comorbidities?.comorbidity_list || [],
            treatments: cr?.treatments?.treatment_types || [],
            hasAbnormalLabs: cr?.investigations?.has_abnormal_values || false,
            bpRange: cr?.investigations?.bp_systolic
              ? `${cr.investigations.bp_systolic}/${cr.investigations.bp_diastolic}`
              : "—",
            bmi: cr?.investigations?.bmi != null ? cr.investigations.bmi.toFixed(1) : "—",
            careSpecialties: (cr?.careTeam || []).map((c: { specialty?: string }) => c.specialty || "—"),
            complications: cr?.complications?.current_complications || [],
            activeMeds: rx.filter((r: { is_active?: boolean }) => r.is_active).length,
          } as PatientClinicalData;
        })
      );
      setComparisonData(results);
    } catch {
      toast({ title: "Failed to load comparison data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (comparisonData.length === 0) return;
    const headers = ["Dimension", ...comparisonData.map((d) => d.label)];
    const rows = [
      ["Diagnosis", ...comparisonData.map((d) => d.diagnosis)],
      ["Comorbidity Count", ...comparisonData.map((d) => String(d.comorbidityCount))],
      ["Comorbidities", ...comparisonData.map((d) => d.comorbidities.join("; "))],
      ["Treatments", ...comparisonData.map((d) => d.treatments.join("; "))],
      ["Abnormal Labs", ...comparisonData.map((d) => d.hasAbnormalLabs ? "Yes" : "No")],
      ["Blood Pressure", ...comparisonData.map((d) => d.bpRange)],
      ["BMI", ...comparisonData.map((d) => d.bmi)],
      ["Care Specialties", ...comparisonData.map((d) => d.careSpecialties.join("; "))],
      ["Complications", ...comparisonData.map((d) => d.complications.join("; "))],
      ["Active Medications", ...comparisonData.map((d) => String(d.activeMeds))],
    ];
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clinical-comparison-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const dimensions = [
    { label: "Diagnosis", key: "diagnosis" },
    { label: "Comorbidity Count", key: "comorbidityCount" },
    { label: "Comorbidities", key: "comorbidities" },
    { label: "Treatments", key: "treatments" },
    { label: "Abnormal Labs", key: "hasAbnormalLabs" },
    { label: "Blood Pressure", key: "bpRange" },
    { label: "BMI", key: "bmi" },
    { label: "Care Specialties", key: "careSpecialties" },
    { label: "Complications", key: "complications" },
    { label: "Active Medications", key: "activeMeds" },
  ] as const;

  const renderValue = (d: PatientClinicalData, key: string) => {
    const val = d[key as keyof PatientClinicalData];
    if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : "—";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return String(val ?? "—");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompareArrows className="h-5 w-5 text-primary" />
          Clinical Comparison
        </CardTitle>
        <CardDescription>
          Select 2–10 patients to compare clinical profiles side-by-side
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Patient selector */}
        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
          {shares.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.includes(s.id)}
                onCheckedChange={() => toggle(s.id)}
              />
              <span className="text-sm">
                {s.is_anonymized
                  ? `ANON-${s.patient_id.substring(0, 8).toUpperCase()}`
                  : s.patient_id.substring(0, 8).toUpperCase()}
              </span>
              <Badge variant="secondary" className="text-xs">
                {(s.disease_category || "general").replace("_", " ")}
              </Badge>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={fetchComparison} disabled={loading || selectedIds.length < 2}>
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...</>
            ) : (
              <><Users className="h-4 w-4 mr-2" /> Compare ({selectedIds.length})</>
            )}
          </Button>
          {comparisonData.length > 0 && (
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          )}
        </div>

        {/* Comparison table */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}

        {!loading && comparisonData.length > 0 && (
          <ScrollArea className="w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium text-muted-foreground sticky left-0 bg-background min-w-[140px]">
                      Dimension
                    </th>
                    {comparisonData.map((d) => (
                      <th key={d.shareId} className="text-left p-2 font-medium min-w-[120px]">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dimensions.map((dim) => (
                    <tr key={dim.key} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium text-muted-foreground sticky left-0 bg-background">
                        {dim.label}
                      </td>
                      {comparisonData.map((d) => (
                        <td key={d.shareId} className="p-2">
                          {renderValue(d, dim.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ClinicalComparisonPanel;
