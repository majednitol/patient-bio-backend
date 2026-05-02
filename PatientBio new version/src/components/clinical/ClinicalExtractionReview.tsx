import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bot, ChevronDown, CheckCircle2, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ExtractedClinicalData {
  background?: {
    family_history?: string;
    lifestyle_notes?: string;
    occupation?: string;
  };
  comorbidities?: {
    comorbidity_list?: string[];
    icd10_mappings?: Record<string, string>;
    smoking_status?: string;
    alcohol_consumption?: string;
  };
  investigations?: Array<{
    investigation_type?: string;
    investigation_date?: string;
    results?: Record<string, string>;
    loinc_code?: string;
    bp_systolic?: number;
    bp_diastolic?: number;
    weight_kg?: number;
    notes?: string;
    has_abnormal_values?: boolean;
  }>;
  treatments?: Array<{
    treatment_types?: string[];
    medication_name?: string;
    medication_dose?: string;
    medication_frequency?: string;
    is_active?: boolean;
  }>;
  care_team?: Array<{
    physician_name?: string;
    specialty?: string;
  }>;
  complications?: {
    current_complications?: string[];
    complication_notes?: string;
    treatment_response?: string;
  };
}

interface ClinicalExtractionReviewProps {
  data: ExtractedClinicalData;
  documentTitle?: string;
  onSaved: () => void;
  onDismiss: () => void;
}

export function ClinicalExtractionReview({
  data,
  documentTitle,
  onSaved,
  onDismiss,
}: ClinicalExtractionReviewProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const sections = [
    { key: "background", label: t("clinicalRecords.tabs.background"), hasData: !!data.background },
    { key: "comorbidities", label: t("clinicalRecords.tabs.comorbidities"), hasData: !!data.comorbidities },
    { key: "investigations", label: t("clinicalRecords.tabs.investigations"), hasData: (data.investigations?.length || 0) > 0 },
    { key: "treatments", label: t("clinicalRecords.tabs.treatments"), hasData: (data.treatments?.length || 0) > 0 },
    { key: "care_team", label: t("clinicalRecords.tabs.careTeam"), hasData: (data.care_team?.length || 0) > 0 },
    { key: "complications", label: t("clinicalRecords.tabs.complications"), hasData: !!data.complications },
  ].filter(s => s.hasData);

  if (sections.length === 0) return null;

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      const sourceLabel = "auto:document";
      const sourceRef = documentTitle || "uploaded document";

      // Save each section
      if (data.background) {
        const { data: existing } = await supabase
          .from("patient_background_info")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!existing) {
          await supabase.from("patient_background_info").insert({
            user_id: user.id,
            ...data.background,
            source: sourceLabel,
            source_ref: sourceRef,
          } as any);
        }
      }

      if (data.comorbidities) {
        const { data: existing } = await supabase
          .from("patient_comorbidities")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!existing) {
          await supabase.from("patient_comorbidities").insert({
            user_id: user.id,
            comorbidity_list: data.comorbidities.comorbidity_list || [],
            icd10_mappings: data.comorbidities.icd10_mappings || {},
            smoking_status: data.comorbidities.smoking_status || null,
            alcohol_consumption: data.comorbidities.alcohol_consumption || null,
            source: sourceLabel,
            source_ref: sourceRef,
          } as any);
        }
      }

      if (data.investigations?.length) {
        for (const inv of data.investigations) {
          await supabase.from("patient_clinical_investigations").insert({
            user_id: user.id,
            investigation_type: inv.investigation_type || "lab",
            investigation_date: inv.investigation_date || new Date().toISOString().split("T")[0],
            results: inv.results || {},
            loinc_code: inv.loinc_code || null,
            bp_systolic: inv.bp_systolic || null,
            bp_diastolic: inv.bp_diastolic || null,
            weight_kg: inv.weight_kg || null,
            notes: inv.notes || null,
            has_abnormal_values: inv.has_abnormal_values || false,
            source: sourceLabel,
            source_ref: sourceRef,
          } as any);
        }
      }

      if (data.treatments?.length) {
        for (const tx of data.treatments) {
          await supabase.from("patient_running_treatments").insert({
            user_id: user.id,
            treatment_types: tx.treatment_types || ["medication"],
            medication_name: tx.medication_name || "",
            medication_dose: tx.medication_dose || "",
            medication_frequency: tx.medication_frequency || "",
            is_active: tx.is_active ?? true,
            treatment_start_date: new Date().toISOString().split("T")[0],
            source: sourceLabel,
            source_ref: sourceRef,
          } as any);
        }
      }

      if (data.care_team?.length) {
        for (const member of data.care_team) {
          const { data: existing } = await supabase
            .from("patient_care_team")
            .select("id")
            .eq("user_id", user.id)
            .eq("physician_name", member.physician_name || "")
            .maybeSingle();
          if (!existing) {
            await supabase.from("patient_care_team").insert({
              user_id: user.id,
              physician_name: member.physician_name || "Unknown",
              specialty: member.specialty || null,
              source: sourceLabel,
              source_ref: sourceRef,
            } as any);
          }
        }
      }

      if (data.complications) {
        const { data: existing } = await supabase
          .from("patient_complications_status")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!existing) {
          await supabase.from("patient_complications_status").insert({
            user_id: user.id,
            current_complications: data.complications.current_complications || [],
            complication_notes: data.complications.complication_notes || null,
            treatment_response: data.complications.treatment_response || null,
            source: sourceLabel,
            source_ref: sourceRef,
          } as any);
        }
      }

      // Invalidate clinical record queries
      queryClient.invalidateQueries({ queryKey: ["clinical-"] });
      queryClient.invalidateQueries({ queryKey: ["clinical-completeness"] });

      toast({ title: t("clinicalRecords.auto.savedSuccess", "Clinical records updated from your document!") });
      onSaved();
    } catch (error) {
      console.error("Error saving clinical data:", error);
      toast({ title: t("clinicalRecords.auto.savedError", "Failed to save clinical data"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm">
              {t("clinicalRecords.auto.detectedTitle", "AI Detected Clinical Data")}
            </CardTitle>
            <CardDescription className="text-xs">
              {t("clinicalRecords.auto.detectedDesc", "We found clinical data in your upload. Review and add to your records.")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="flex flex-wrap gap-1.5">
          {sections.map((s) => (
            <Badge key={s.key} variant="secondary" className="text-[10px]">
              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
              {s.label}
            </Badge>
          ))}
        </div>

        {/* Expandable preview */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="h-3 w-3" />
            {t("clinicalRecords.auto.preview", "Preview extracted data")}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {data.treatments?.map((tx, i) => (
              <div key={i} className="text-xs p-2 rounded bg-background border">
                <span className="font-medium">{tx.medication_name}</span>
                {tx.medication_dose && <span className="text-muted-foreground"> — {tx.medication_dose}</span>}
                {tx.medication_frequency && <span className="text-muted-foreground"> ({tx.medication_frequency})</span>}
              </div>
            ))}
            {data.comorbidities?.comorbidity_list?.map((c, i) => (
              <div key={i} className="text-xs p-2 rounded bg-background border">
                <span className="font-medium">{c}</span>
                {data.comorbidities?.icd10_mappings?.[c] && (
                  <Badge variant="outline" className="ml-1 text-[9px]">{data.comorbidities.icd10_mappings[c]}</Badge>
                )}
              </div>
            ))}
            {data.investigations?.map((inv, i) => (
              <div key={i} className="text-xs p-2 rounded bg-background border">
                <span className="font-medium capitalize">{inv.investigation_type}</span>
                {inv.investigation_date && <span className="text-muted-foreground"> — {inv.investigation_date}</span>}
                {inv.has_abnormal_values && <Badge variant="destructive" className="ml-1 text-[9px]">Abnormal</Badge>}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
            {t("clinicalRecords.auto.addToRecords", "Add to Clinical Records")}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss} disabled={saving}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
