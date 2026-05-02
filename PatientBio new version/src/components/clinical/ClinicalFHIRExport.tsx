import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useBackgroundInfo, useComorbidities, useClinicalInvestigations, useTreatments, useCareTeam, useComplicationsStatus } from "@/hooks/useClinicalRecords";
import { lookupICD10Code, getFHIRICD10Coding } from "@/lib/icd10CodeMapper";
import { LOINC_CODES } from "@/lib/clinicalReferenceRanges";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export function ClinicalFHIRExport() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const bg = useBackgroundInfo();
  const co = useComorbidities();
  const inv = useClinicalInvestigations();
  const tx = useTreatments();
  const ct = useCareTeam();
  const cs = useComplicationsStatus();

  const handleExport = () => {
    setExporting(true);
    try {
      const entries: any[] = [];
      const patientId = user?.id ?? "unknown";

      // Patient resource
      entries.push({
        fullUrl: `urn:uuid:${patientId}`,
        resource: {
          resourceType: "Patient",
          id: patientId,
          extension: bg.data ? [
            bg.data.education_level && { url: "http://hl7.org/fhir/StructureDefinition/patient-education", valueString: bg.data.education_level },
            bg.data.occupation && { url: "http://hl7.org/fhir/StructureDefinition/patient-occupation", valueString: bg.data.occupation },
          ].filter(Boolean) : [],
        },
      });

      // Conditions from comorbidities
      const comorbidities = (co.data?.comorbidity_list as string[]) ?? [];
      comorbidities.forEach((c, i) => {
        const coding = getFHIRICD10Coding(c.replace(/_/g, " "));
        entries.push({
          fullUrl: `urn:uuid:condition-${i}`,
          resource: {
            resourceType: "Condition",
            id: `condition-${i}`,
            subject: { reference: `urn:uuid:${patientId}` },
            code: coding,
            clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
          },
        });
      });

      // Observations from investigations
      (inv.data ?? []).forEach((ob, i) => {
        const loinc = LOINC_CODES[ob.investigation_type ?? ""];
        const results = ob.results as Record<string, unknown> ?? {};
        entries.push({
          fullUrl: `urn:uuid:observation-${i}`,
          resource: {
            resourceType: "Observation",
            id: `observation-${i}`,
            status: "final",
            code: loinc ? { coding: [{ system: "http://loinc.org", code: loinc.code, display: loinc.display }], text: ob.investigation_type } : { text: ob.investigation_type },
            subject: { reference: `urn:uuid:${patientId}` },
            effectiveDateTime: ob.investigation_date,
            component: Object.entries(results).map(([k, v]) => ({
              code: { text: k.replace(/_/g, " ") },
              valueQuantity: { value: Number(v) },
            })),
          },
        });
      });

      // MedicationStatements
      (tx.data ?? []).forEach((t, i) => {
        if (t.medication_name) {
          entries.push({
            fullUrl: `urn:uuid:medication-${i}`,
            resource: {
              resourceType: "MedicationStatement",
              id: `medication-${i}`,
              status: t.is_active ? "active" : "completed",
              subject: { reference: `urn:uuid:${patientId}` },
              medicationCodeableConcept: { text: t.medication_name },
              dosage: [{ text: `${t.medication_dose ?? ""} ${t.medication_frequency ?? ""}`.trim() }],
              effectivePeriod: { start: t.treatment_start_date, end: t.treatment_end_date },
            },
          });
        }
      });

      // CareTeam
      const members = (ct.data ?? []).map((m: any) => ({
        member: { display: m.physician_name },
        role: m.specialty ? [{ text: m.specialty }] : undefined,
      }));
      if (members.length) {
        entries.push({
          fullUrl: "urn:uuid:careteam-0",
          resource: {
            resourceType: "CareTeam",
            id: "careteam-0",
            status: "active",
            subject: { reference: `urn:uuid:${patientId}` },
            participant: members,
          },
        });
      }

      const bundle = {
        resourceType: "Bundle",
        type: "collection",
        timestamp: new Date().toISOString(),
        entry: entries,
      };

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clinical-records-fhir-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("clinicalRecords.exportSuccess") });
    } catch (e: any) {
      toast({ title: t("clinicalRecords.exportFailed"), description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="press-feedback">
      {exporting ? <Loader2 className="h-4 w-4 sm:mr-1 animate-spin" /> : <Download className="h-4 w-4 sm:mr-1" />}
      <span className="hidden sm:inline">{t("clinicalRecords.exportFHIR")}</span>
    </Button>
  );
}
