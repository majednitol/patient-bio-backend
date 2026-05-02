/**
 * NeedsAttentionSection - Shows patients with critical/warning risk flags
 * pinned above the main patient list for quick doctor attention.
 */
import { useState, useCallback } from "react";
import { usePatientVitalsHistory } from "@/hooks/usePatientVitals";
import { usePatientRiskFlags, RiskFlag } from "@/hooks/usePatientRiskFlags";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientData {
  patient_id: string;
  display_name: string | null;
  patient_profile?: { avatar_url: string | null } | null;
}

interface Props {
  patients: PatientData[];
  onViewPatient: (patient: any) => void;
}

function PatientRiskChecker({
  patient,
  onResult,
}: {
  patient: PatientData;
  onResult: (flags: RiskFlag[], highestLevel: string | null) => void;
}) {
  const { data: vitals } = usePatientVitalsHistory(patient.patient_id, 5);
  const { flags, highestLevel } = usePatientRiskFlags(vitals);
  const reported = useState(false);

  // Report once when flags are available
  if (flags.length > 0 && !reported[0]) {
    reported[1](true);
    queueMicrotask(() => onResult(flags, highestLevel));
  }
  return null;
}

export function NeedsAttentionSection({ patients, onViewPatient }: Props) {
  const [attentionMap, setAttentionMap] = useState<
    Record<string, { flags: RiskFlag[]; level: string | null }>
  >({});

  const handleResult = useCallback(
    (patientId: string) => (flags: RiskFlag[], level: string | null) => {
      setAttentionMap((prev) => {
        if (prev[patientId]) return prev;
        return { ...prev, [patientId]: { flags, level } };
      });
    },
    []
  );

  const attentionPatients = patients.filter(
    (p) => attentionMap[p.patient_id]?.level === "critical" || attentionMap[p.patient_id]?.level === "warning"
  );

  return (
    <>
      {/* Hidden checkers - only check first 20 for perf */}
      {patients.slice(0, 20).map((patient) => (
        <PatientRiskChecker
          key={patient.patient_id}
          patient={patient}
          onResult={handleResult(patient.patient_id)}
        />
      ))}

      {attentionPatients.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold">Needs Attention</h3>
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-auto">
              {attentionPatients.length}
            </Badge>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {attentionPatients.slice(0, 5).map((patient) => {
              const info = attentionMap[patient.patient_id];
              return (
                <button
                  key={patient.patient_id}
                  onClick={() => onViewPatient(patient)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors shrink-0 text-left",
                    info?.level === "critical" && "border-destructive/40"
                  )}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={patient.patient_profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-destructive/10 text-destructive text-[10px]">
                      {patient.display_name?.[0]?.toUpperCase() || "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate max-w-[100px]">
                      {patient.display_name || "Unknown"}
                    </p>
                    <div className="flex gap-1 mt-0.5">
                      {info?.flags.slice(0, 2).map((f) => (
                        <Badge
                          key={f.id}
                          variant={f.level === "critical" ? "destructive" : "secondary"}
                          className="text-[9px] px-1 py-0"
                        >
                          {f.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
