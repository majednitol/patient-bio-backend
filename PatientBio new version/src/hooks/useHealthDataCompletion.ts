import { useHealthData } from "@/hooks/useHealthData";

const FIELDS = [
  "height",
  "blood_group",
  "health_allergies",
  "current_medications",
  "previous_diseases",
  "chronic_diseases",
  "bad_habits",
  "birth_defects",
  "emergency_contact_name",
  "emergency_contact_phone",
] as const;

export function useHealthDataCompletion() {
  const { healthData, loading } = useHealthData();

  if (loading || !healthData) {
    return { percentage: 0, isLoading: loading };
  }

  const filled = FIELDS.filter((f) => {
    const val = healthData[f];
    return val !== null && val !== undefined && val !== "";
  }).length;

  return { percentage: Math.round((filled / FIELDS.length) * 100), isLoading: false };
}
