import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ExportOptions {
  format: "csv" | "json" | "fhir";
  includeFields: {
    profile: boolean;
    healthData: boolean;
    recordsList: boolean;
    shareStatus: boolean;
    clinicalRecords: boolean;
    prescriptions: boolean;
  };
  filterByStatus: "pending" | "viewed" | "completed" | "all";
}

interface PatientExportData {
  patientId: string;
  anonymousId: string;
  isAnonymized: boolean;
  diseaseCategory: string;
  shareStatus: string;
  sharedAt: string;
  viewedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  // Profile fields
  displayName?: string;
  dateOfBirth?: string;
  gender?: string;
  // Health data fields
  bloodGroup?: string;
  allergies?: string;
  chronicDiseases?: string;
  currentMedications?: string;
  previousDiseases?: string;
  // Records
  recordsCount: number;
  recordsTitles?: string;
  // Clinical records
  primaryDiagnosis?: string;
  comorbidityCount?: number;
  comorbidities?: string;
  activeTreatments?: string;
  hasAbnormalLabs?: boolean;
  careTeamSpecialties?: string;
  complications?: string;
  activePrescriptions?: number;
  clinicalRecordsRaw?: Record<string, unknown>;
  prescriptionsRaw?: unknown[];
}

interface ShareRecord {
  id: string;
  patient_id: string;
  is_anonymized: boolean;
  disease_category: string | null;
  status: string;
  shared_at: string;
  viewed_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  research_purpose: string | null;
}

function buildExportRow(share: ShareRecord, detailedData: any | null, options: ExportOptions): PatientExportData {
  const row: PatientExportData = {
    patientId: share.patient_id,
    anonymousId: `ANON-${share.patient_id.substring(0, 8)}`,
    isAnonymized: share.is_anonymized,
    diseaseCategory: share.disease_category || "general",
    shareStatus: share.status,
    sharedAt: share.shared_at,
    viewedAt: share.viewed_at,
    completedAt: share.completed_at,
    expiresAt: share.expires_at,
    recordsCount: detailedData?.records?.length || 0,
  };

  if (options.includeFields.profile && detailedData?.profile && !share.is_anonymized) {
    row.displayName = detailedData.profile.display_name;
    row.dateOfBirth = detailedData.profile.date_of_birth;
    row.gender = detailedData.profile.gender;
  }

  if (options.includeFields.healthData && detailedData?.healthData) {
    row.bloodGroup = detailedData.healthData.blood_group;
    row.allergies = detailedData.healthData.health_allergies;
    row.chronicDiseases = detailedData.healthData.chronic_diseases;
    row.currentMedications = detailedData.healthData.current_medications;
    row.previousDiseases = detailedData.healthData.previous_diseases;
  }

  if (options.includeFields.recordsList && detailedData?.records) {
    row.recordsTitles = detailedData.records.map((r: any) => r.title).join("; ");
  }

  if (options.includeFields.clinicalRecords && detailedData?.clinicalRecords) {
    const cr = detailedData.clinicalRecords as Record<string, any>;
    row.primaryDiagnosis = cr.background?.primary_diagnosis || "";
    row.comorbidityCount = cr.comorbidities?.comorbidity_list?.length || 0;
    row.comorbidities = (cr.comorbidities?.comorbidity_list || []).join("; ");
    row.activeTreatments = (cr.treatments?.treatment_types || []).join("; ");
    row.hasAbnormalLabs = cr.investigations?.has_abnormal_values || false;
    row.careTeamSpecialties = (cr.careTeam || []).map((c: any) => c.specialty).filter(Boolean).join("; ");
    row.complications = (cr.complications?.current_complications || []).join("; ");
    row.clinicalRecordsRaw = cr;

    const rxArr = detailedData.prescriptions as Array<Record<string, any>> | undefined;
    row.activePrescriptions = rxArr?.filter((r) => r.is_active).length || 0;
    row.prescriptionsRaw = rxArr || [];
  }

  return row;
}

async function doIndividualFetch(
  filteredShares: ShareRecord[],
  exportRows: PatientExportData[],
  options: ExportOptions,
  fetchShareData: (id: string) => Promise<any>,
  setProgress: (p: { current: number; total: number }) => void
) {
  const batchSize = 5;
  for (let i = 0; i < filteredShares.length; i += batchSize) {
    const batch = filteredShares.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (share) => {
        const needsFetch = options.includeFields.profile ||
          options.includeFields.healthData ||
          options.includeFields.recordsList ||
          options.includeFields.clinicalRecords;
        const detailedData = needsFetch ? await fetchShareData(share.id) : null;
        return buildExportRow(share, detailedData, options);
      })
    );
    exportRows.push(...batchResults);
    setProgress({ current: Math.min(i + batchSize, filteredShares.length), total: filteredShares.length });
  }
}

export const useResearchDataExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const fetchShareData = async (shareId: string): Promise<{
    profile: { display_name?: string; date_of_birth?: string; gender?: string } | null;
    healthData: {
      blood_group?: string;
      health_allergies?: string;
      chronic_diseases?: string;
      current_medications?: string;
      previous_diseases?: string;
    } | null;
    records: Array<{ id: string; title: string }>;
    isAnonymized: boolean;
    clinicalRecords?: Record<string, unknown>;
    prescriptions?: Array<Record<string, unknown>>;
  } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("get-patient-data-for-researcher", {
        body: { share_id: shareId },
      });

      if (error || data?.error) {
        console.error("Error fetching share data:", error || data?.error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Error fetching share data:", err);
      return null;
    }
  };

  const exportData = async (
    shares: ShareRecord[],
    options: ExportOptions
  ): Promise<boolean> => {
    if (shares.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no shares matching your criteria",
        variant: "destructive",
      });
      return false;
    }

    setIsExporting(true);
    setProgress({ current: 0, total: shares.length });

    try {
      // Filter by status if not "all"
      const filteredShares =
        options.filterByStatus === "all"
          ? shares
          : shares.filter((s) => s.status === options.filterByStatus);

      if (filteredShares.length === 0) {
        toast({
          title: "No data to export",
          description: `No shares with status "${options.filterByStatus}"`,
          variant: "destructive",
        });
        setIsExporting(false);
        return false;
      }

      const exportRows: PatientExportData[] = [];
      const useBulk = filteredShares.length >= 10;

      if (useBulk) {
        // Use server-side bulk export for large cohorts
        try {
          const shareIds = filteredShares.map((s) => s.id);
          const { data: bulkData, error: bulkError } = await supabase.functions.invoke("bulk-research-export", {
            body: {
              shareIds: shareIds,
              includeProfile: options.includeFields.profile,
              includeHealthData: options.includeFields.healthData,
              includeClinicalRecords: options.includeFields.clinicalRecords,
              includePrescriptions: (options.includeFields as any).prescriptions ?? options.includeFields.clinicalRecords,
            },
          });

          if (bulkError) throw bulkError;

          const bulkResults = bulkData?.data || [];
          for (let idx = 0; idx < filteredShares.length; idx++) {
            const share = filteredShares[idx];
            const patientData = bulkResults.find((p: any) => p.shareId === share.id);
            exportRows.push(buildExportRow(share, patientData || null, options));
            setProgress({ current: idx + 1, total: filteredShares.length });
          }
        } catch (bulkErr) {
          console.warn("Bulk export failed, falling back to individual fetches:", bulkErr);
          if (exportRows.length === 0) {
            await doIndividualFetch(filteredShares, exportRows, options, fetchShareData, setProgress);
          }
        }
      } else {
        await doIndividualFetch(filteredShares, exportRows, options, fetchShareData, setProgress);
      }

      // Generate file based on format
      if (options.format === "csv") {
        downloadCSV(exportRows, options);
      } else if (options.format === "fhir") {
        downloadFHIRBundle(exportRows);
      } else {
        downloadJSON(exportRows);
      }

      toast({
        title: "Export successful",
        description: `Exported ${exportRows.length} patient records`,
      });

      return true;
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An error occurred during export",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsExporting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const downloadCSV = (data: PatientExportData[], options: ExportOptions) => {
    const headers: string[] = [
      "Patient ID",
      "Disease Category",
    ];

    if (options.includeFields.shareStatus) {
      headers.push("Share Status", "Shared Date", "Viewed Date", "Completed Date", "Expires Date");
    }

    if (options.includeFields.profile) {
      headers.push("Display Name", "Date of Birth", "Gender");
    }

    if (options.includeFields.healthData) {
      headers.push("Blood Group", "Allergies", "Chronic Diseases", "Current Medications", "Previous Diseases");
    }

    if (options.includeFields.recordsList) {
      headers.push("Records Count", "Record Titles");
    }

    if (options.includeFields.clinicalRecords) {
      headers.push("Primary Diagnosis", "Comorbidity Count", "Comorbidities", "Active Treatments", "Abnormal Labs", "Care Team Specialties", "Complications", "Active Prescriptions");
    }

    const rows = data.map((row) => {
      const values: string[] = [
        row.isAnonymized ? row.anonymousId : row.patientId,
        row.diseaseCategory,
      ];

      if (options.includeFields.shareStatus) {
        values.push(
          row.shareStatus,
          row.sharedAt ? new Date(row.sharedAt).toISOString().split("T")[0] : "",
          row.viewedAt ? new Date(row.viewedAt).toISOString().split("T")[0] : "",
          row.completedAt ? new Date(row.completedAt).toISOString().split("T")[0] : "",
          row.expiresAt ? new Date(row.expiresAt).toISOString().split("T")[0] : ""
        );
      }

      if (options.includeFields.profile) {
        values.push(
          row.displayName || "",
          row.dateOfBirth ? new Date(row.dateOfBirth).toISOString().split("T")[0] : "",
          row.gender || ""
        );
      }

      if (options.includeFields.healthData) {
        values.push(
          row.bloodGroup || "",
          escapeCsvValue(row.allergies || ""),
          escapeCsvValue(row.chronicDiseases || ""),
          escapeCsvValue(row.currentMedications || ""),
          escapeCsvValue(row.previousDiseases || "")
        );
      }

      if (options.includeFields.recordsList) {
        values.push(
          String(row.recordsCount),
          escapeCsvValue(row.recordsTitles || "")
        );
      }

      if (options.includeFields.clinicalRecords) {
        values.push(
          escapeCsvValue(row.primaryDiagnosis || ""),
          String(row.comorbidityCount || 0),
          escapeCsvValue(row.comorbidities || ""),
          escapeCsvValue(row.activeTreatments || ""),
          row.hasAbnormalLabs ? "Yes" : "No",
          escapeCsvValue(row.careTeamSpecialties || ""),
          escapeCsvValue(row.complications || ""),
          String(row.activePrescriptions || 0)
        );
      }

      return values.map(escapeCsvValue).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    downloadFile(csvContent, "text/csv;charset=utf-8;", "csv");
  };

  const downloadJSON = (data: PatientExportData[]) => {
    const jsonContent = JSON.stringify(
      data.map((row) => ({
        ...row,
        patientId: row.isAnonymized ? row.anonymousId : row.patientId,
      })),
      null,
      2
    );
    downloadFile(jsonContent, "application/json", "json");
  };

  const downloadFHIRBundle = (data: PatientExportData[]) => {
    const bundle = {
      resourceType: "Bundle",
      type: "collection",
      timestamp: new Date().toISOString(),
      total: data.length,
      entry: data.map((row) => {
        const patientResource: Record<string, unknown> = {
          resourceType: "Patient",
          id: row.isAnonymized ? row.anonymousId : row.patientId,
          meta: {
            tag: [
              { system: "http://patientbio.app/tags", code: row.diseaseCategory, display: row.diseaseCategory },
              ...(row.isAnonymized ? [{ system: "http://patientbio.app/tags", code: "anonymized" }] : []),
            ],
          },
        };

        if (!row.isAnonymized && row.displayName) {
          patientResource.name = [{ text: row.displayName }];
        }
        if (row.dateOfBirth) {
          patientResource.birthDate = row.dateOfBirth.split("T")[0];
        }
        if (row.gender) {
          patientResource.gender = row.gender.toLowerCase();
        }

        const entries: Array<{ resource: Record<string, unknown> }> = [
          { resource: patientResource },
        ];

        // Add conditions
        if (row.chronicDiseases) {
          row.chronicDiseases.split(",").map((c) => c.trim()).filter(Boolean).forEach((condition) => {
            entries.push({
              resource: {
                resourceType: "Condition",
                subject: { reference: `Patient/${patientResource.id}` },
                code: { text: condition },
                category: [{ coding: [{ code: "problem-list-item", display: "Problem List Item" }] }],
              },
            });
          });
        }

        // Add allergies
        if (row.allergies) {
          row.allergies.split(",").map((a) => a.trim()).filter(Boolean).forEach((allergy) => {
            entries.push({
              resource: {
                resourceType: "AllergyIntolerance",
                patient: { reference: `Patient/${patientResource.id}` },
                code: { text: allergy },
              },
            });
          });
        }

        // Add medications
        if (row.currentMedications) {
          row.currentMedications.split(",").map((m) => m.trim()).filter(Boolean).forEach((med) => {
            entries.push({
              resource: {
                resourceType: "MedicationStatement",
                subject: { reference: `Patient/${patientResource.id}` },
                medicationCodeableConcept: { text: med },
                status: "active",
              },
            });
          });
        }

        // Add clinical FHIR resources
        if (row.clinicalRecordsRaw) {
          const cr = row.clinicalRecordsRaw as Record<string, any>;
          // Conditions from comorbidities
          if (cr.comorbidities?.comorbidity_list) {
            (cr.comorbidities.comorbidity_list as string[]).forEach((c: string) => {
              const icd = cr.comorbidities?.icd10_mappings?.[c];
              entries.push({
                resource: {
                  resourceType: "Condition",
                  subject: { reference: `Patient/${patientResource.id}` },
                  code: icd ? { coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: icd, display: c }], text: c } : { text: c },
                  category: [{ coding: [{ code: "comorbidity" }] }],
                },
              });
            });
          }
          // Observations from investigations
          if (cr.investigations?.bp_systolic) {
            entries.push({
              resource: {
                resourceType: "Observation",
                subject: { reference: `Patient/${patientResource.id}` },
                code: { coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure" }] },
                component: [
                  { code: { text: "Systolic" }, valueQuantity: { value: cr.investigations.bp_systolic, unit: "mmHg" } },
                  { code: { text: "Diastolic" }, valueQuantity: { value: cr.investigations.bp_diastolic, unit: "mmHg" } },
                ],
              },
            });
          }
          // CareTeam
          if (cr.careTeam?.length > 0) {
            entries.push({
              resource: {
                resourceType: "CareTeam",
                subject: { reference: `Patient/${patientResource.id}` },
                participant: (cr.careTeam as Array<{ specialty?: string }>).map((m) => ({
                  role: [{ text: m.specialty || "Unknown" }],
                })),
              },
            });
          }
        }

        return entries;
      }).flat(),
    };

    const content = JSON.stringify(bundle, null, 2);
    downloadFile(content, "application/fhir+json", "fhir.json");
  };

  const escapeCsvValue = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const downloadFile = (content: string, mimeType: string, extension: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `research-data-export-${new Date().toISOString().split("T")[0]}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    exportData,
    isExporting,
    progress,
  };
};
