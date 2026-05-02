/**
 * Clinical Reference Ranges & Abnormal Detection
 * Used for color-coding lab results and flagging abnormal values for research filtering.
 */

export interface ReferenceRange {
  field: string;
  label: string;
  unit: string;
  low: number;
  high: number;
  criticalLow?: number;
  criticalHigh?: number;
}

export type RangeStatus = "normal" | "borderline" | "abnormal" | "critical" | "unknown";

const REFERENCE_RANGES: Record<string, ReferenceRange[]> = {
  cbc: [
    { field: "hgb", label: "Hemoglobin", unit: "g/dL", low: 12.0, high: 17.5, criticalLow: 7.0, criticalHigh: 20.0 },
    { field: "wbc", label: "WBC", unit: "×10³/µL", low: 4.5, high: 11.0, criticalLow: 2.0, criticalHigh: 30.0 },
    { field: "platelets", label: "Platelets", unit: "×10³/µL", low: 150, high: 400, criticalLow: 50, criticalHigh: 1000 },
    { field: "rbc", label: "RBC", unit: "×10⁶/µL", low: 4.0, high: 5.5, criticalLow: 2.5, criticalHigh: 7.0 },
    { field: "hct", label: "Hematocrit", unit: "%", low: 36, high: 50, criticalLow: 20, criticalHigh: 60 },
  ],
  creatinine_egfr: [
    { field: "creatinine", label: "Creatinine", unit: "mg/dL", low: 0.6, high: 1.2, criticalLow: 0.3, criticalHigh: 10.0 },
    { field: "egfr", label: "eGFR", unit: "mL/min", low: 60, high: 120, criticalLow: 15, criticalHigh: 200 },
  ],
  hba1c: [
    { field: "hba1c_percent", label: "HbA1c", unit: "%", low: 4.0, high: 5.6, criticalLow: 3.0, criticalHigh: 14.0 },
  ],
  fbs: [
    { field: "fbs_mg_dl", label: "Fasting Blood Sugar", unit: "mg/dL", low: 70, high: 100, criticalLow: 40, criticalHigh: 400 },
  ],
  lipid_profile: [
    { field: "total_cholesterol", label: "Total Cholesterol", unit: "mg/dL", low: 0, high: 200, criticalHigh: 300 },
    { field: "ldl", label: "LDL", unit: "mg/dL", low: 0, high: 100, criticalHigh: 190 },
    { field: "hdl", label: "HDL", unit: "mg/dL", low: 40, high: 100 },
    { field: "triglycerides", label: "Triglycerides", unit: "mg/dL", low: 0, high: 150, criticalHigh: 500 },
  ],
  urinalysis: [
    { field: "ph", label: "pH", unit: "", low: 4.5, high: 8.0 },
  ],
  vitals: [
    { field: "bp_systolic", label: "BP Systolic", unit: "mmHg", low: 90, high: 120, criticalLow: 70, criticalHigh: 180 },
    { field: "bp_diastolic", label: "BP Diastolic", unit: "mmHg", low: 60, high: 80, criticalLow: 40, criticalHigh: 120 },
    { field: "bmi", label: "BMI", unit: "kg/m²", low: 18.5, high: 24.9, criticalHigh: 40 },
  ],
};

/** LOINC codes mapped to investigation types */
export const LOINC_CODES: Record<string, { code: string; display: string }> = {
  cbc: { code: "58410-2", display: "CBC panel" },
  creatinine_egfr: { code: "2160-0", display: "Creatinine & eGFR" },
  hba1c: { code: "4548-4", display: "Hemoglobin A1c" },
  fbs: { code: "1558-6", display: "Fasting Glucose" },
  lipid_profile: { code: "57698-3", display: "Lipid Panel" },
  urinalysis: { code: "24356-8", display: "Urinalysis" },
};

export function getRangeForField(investigationType: string, field: string): ReferenceRange | undefined {
  const ranges = REFERENCE_RANGES[investigationType] ?? [];
  return ranges.find((r) => r.field === field) ?? REFERENCE_RANGES.vitals?.find((r) => r.field === field);
}

export function getFieldStatus(value: number, range: ReferenceRange): RangeStatus {
  if (range.criticalLow !== undefined && value < range.criticalLow) return "critical";
  if (range.criticalHigh !== undefined && value > range.criticalHigh) return "critical";
  if (value < range.low) return "abnormal";
  if (value > range.high) return "abnormal";
  // Borderline: within 10% of boundary
  const margin = (range.high - range.low) * 0.1;
  if (value < range.low + margin || value > range.high - margin) return "borderline";
  return "normal";
}

export function getStatusColor(status: RangeStatus): string {
  switch (status) {
    case "normal": return "text-green-600 dark:text-green-400";
    case "borderline": return "text-yellow-600 dark:text-yellow-400";
    case "abnormal": return "text-red-500 dark:text-red-400";
    case "critical": return "text-red-700 dark:text-red-300 font-bold";
    default: return "text-muted-foreground";
  }
}

export function getStatusBgColor(status: RangeStatus): string {
  switch (status) {
    case "normal": return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
    case "borderline": return "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800";
    case "abnormal": return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
    case "critical": return "bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-700";
    default: return "bg-muted border-border";
  }
}

/** Check if an investigation has any abnormal values */
export function hasAbnormalValues(
  investigationType: string,
  results: Record<string, unknown>,
  bpSystolic?: number | null,
  bpDiastolic?: number | null,
  bmi?: number | null
): boolean {
  const ranges = REFERENCE_RANGES[investigationType] ?? [];
  
  for (const range of ranges) {
    const val = Number(results[range.field]);
    if (!isNaN(val) && val > 0) {
      const status = getFieldStatus(val, range);
      if (status === "abnormal" || status === "critical") return true;
    }
  }

  // Check vitals
  const vitalChecks = [
    { value: bpSystolic, field: "bp_systolic" },
    { value: bpDiastolic, field: "bp_diastolic" },
    { value: bmi, field: "bmi" },
  ];
  for (const vc of vitalChecks) {
    if (vc.value != null) {
      const range = REFERENCE_RANGES.vitals?.find((r) => r.field === vc.field);
      if (range) {
        const status = getFieldStatus(vc.value, range);
        if (status === "abnormal" || status === "critical") return true;
      }
    }
  }

  return false;
}

export function getRangesForType(investigationType: string): ReferenceRange[] {
  return REFERENCE_RANGES[investigationType] ?? [];
}
