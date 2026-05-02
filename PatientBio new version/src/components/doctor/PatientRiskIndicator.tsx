/**
 * Wrapper that fetches vitals for a single patient and renders a PatientRiskBadge
 * plus predictive risk badge. Used inline in lists.
 */
import { usePatientVitalsHistory } from "@/hooks/usePatientVitals";
import { usePatientRiskFlags } from "@/hooks/usePatientRiskFlags";
import { PatientRiskBadge } from "@/components/doctor/PatientRiskBadge";
import { DoctorPredictiveRiskBadge } from "@/components/doctor/DoctorPredictiveRiskBadge";

interface Props {
  patientId: string;
  compact?: boolean;
}

export function PatientRiskIndicator({ patientId, compact = true }: Props) {
  const { data: vitals } = usePatientVitalsHistory(patientId, 10);
  const { flags, highestLevel } = usePatientRiskFlags(vitals);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {highestLevel && <PatientRiskBadge flags={flags} highestLevel={highestLevel} compact={compact} />}
      <DoctorPredictiveRiskBadge patientId={patientId} />
    </div>
  );
}
