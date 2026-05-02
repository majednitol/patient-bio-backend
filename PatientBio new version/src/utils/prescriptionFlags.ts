import { Medication, Prescription } from "@/hooks/usePrescriptions";

const ANTIBIOTIC_NAMES = [
  "amoxicillin", "azithromycin", "ciprofloxacin", "doxycycline",
  "metronidazole", "cephalexin", "levofloxacin", "clindamycin",
  "penicillin", "ampicillin", "erythromycin", "clarithromycin",
  "tetracycline", "trimethoprim", "sulfamethoxazole", "nitrofurantoin",
  "ceftriaxone", "cefuroxime", "cefixime", "cefpodoxime",
  "moxifloxacin", "ofloxacin", "norfloxacin", "gentamicin",
  "vancomycin", "linezolid", "rifampin", "rifampicin",
  "minocycline", "tobramycin", "amikacin", "piperacillin",
  "meropenem", "imipenem", "ceftazidime", "cefotaxime",
  "augmentin", "co-amoxiclav", "flucloxacillin", "dicloxacillin",
];

export function isAntibiotic(medicationName: string): boolean {
  const name = medicationName.toLowerCase().trim();
  return ANTIBIOTIC_NAMES.some(
    (ab) => name.includes(ab) || ab.includes(name)
  );
}

export function prescriptionHasAntibiotic(medications: Medication[]): boolean {
  return medications.some((m) => isAntibiotic(m.name));
}

export interface Complication {
  type: string;
  message: string;
  severity: "warning" | "error";
}

export function getPrescriptionComplications(prescription: Prescription): Complication[] {
  const complications: Complication[] = [];
  const now = new Date();

  // 1. Follow-up date overdue
  if (prescription.follow_up_date && prescription.is_active) {
    const followUp = new Date(prescription.follow_up_date);
    if (followUp < now) {
      const days = Math.floor((now.getTime() - followUp.getTime()) / (1000 * 60 * 60 * 24));
      complications.push({
        type: "overdue_followup",
        message: `Follow-up was due ${days} day(s) ago`,
        severity: "error",
      });
    }
  }

  // 2. Missing medication instructions
  const missingInstructions = prescription.medications.filter((m) => !m.instructions);
  if (missingInstructions.length > 0) {
    complications.push({
      type: "missing_instructions",
      message: `${missingInstructions.length} medication(s) missing instructions`,
      severity: "warning",
    });
  }

  // 3. High medication count
  if (prescription.medications.length >= 3) {
    complications.push({
      type: "high_med_count",
      message: `${prescription.medications.length} medications — monitor for interactions`,
      severity: "warning",
    });
  }

  // 4. Duration exceeded check
  if (prescription.is_active) {
    const createdAt = new Date(prescription.created_at);
    const durationExceeded = prescription.medications.filter((med) => {
      const daysMatch = med.duration.match(/(\d+)\s*day/i);
      const weeksMatch = med.duration.match(/(\d+)\s*week/i);
      const monthsMatch = med.duration.match(/(\d+)\s*month/i);
      let durationDays = 0;
      if (daysMatch) durationDays = parseInt(daysMatch[1]);
      else if (weeksMatch) durationDays = parseInt(weeksMatch[1]) * 7;
      else if (monthsMatch) durationDays = parseInt(monthsMatch[1]) * 30;
      else return false;

      const endDate = new Date(createdAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
      return endDate < now;
    });

    if (durationExceeded.length > 0 && durationExceeded.length === prescription.medications.length) {
      complications.push({
        type: "all_durations_exceeded",
        message: "All medication durations have passed but prescription is still active",
        severity: "error",
      });
    } else if (durationExceeded.length > 0) {
      complications.push({
        type: "duration_exceeded",
        message: `${durationExceeded.length} medication(s) past their duration`,
        severity: "warning",
      });
    }
  }

  return complications;
}
