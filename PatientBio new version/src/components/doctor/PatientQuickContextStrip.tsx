import { usePatientHealthData } from "@/hooks/useDoctorPatients";
import { useDoctorPrescriptions } from "@/hooks/usePrescriptions";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Pill, Droplets, Calendar, Heart } from "lucide-react";
import { format } from "date-fns";
import {
  detectChronicConditions,
  CONDITION_COLORS,
  CONDITION_LABELS,
} from "@/constants/chronicCareTemplates";

interface PatientQuickContextStripProps {
  patientId: string;
}

export function PatientQuickContextStrip({ patientId }: PatientQuickContextStripProps) {
  const { data, isLoading } = usePatientHealthData(patientId);
  const { data: prescriptions } = useDoctorPrescriptions(patientId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground ml-1.5">Loading...</span>
      </div>
    );
  }

  if (!data) return null;

  const allergies = data.healthData?.health_allergies;
  const hasAllergies = !!allergies && allergies.toLowerCase() !== "none";
  const allergyList = hasAllergies
    ? allergies.split(/[,;]/).map((a: string) => a.trim()).filter(Boolean)
    : [];

  const bloodGroup = data.healthData?.blood_group;
  const chronicDiseases = data.healthData?.chronic_diseases;
  const hasChronic = !!chronicDiseases && chronicDiseases.toLowerCase() !== "none";

  const activeMeds = prescriptions?.filter((p) => p.is_active) || [];
  const lastRx = prescriptions?.[0];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 rounded-lg bg-muted/40 border border-dashed">
      {/* Allergies */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
          <AlertTriangle className="h-2.5 w-2.5" />
          Allergies
        </p>
        {hasAllergies ? (
          <div className="flex flex-wrap gap-1">
            {allergyList.slice(0, 3).map((a, i) => (
              <Badge key={i} variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                {a}
              </Badge>
            ))}
            {allergyList.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                +{allergyList.length - 3}
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">None</p>
        )}
      </div>

      {/* Active Medications */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
          <Pill className="h-2.5 w-2.5" />
          Active Rx
        </p>
        <p className="text-xs font-medium">
          {activeMeds.length > 0 ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {activeMeds.length} active
            </Badge>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </p>
      </div>

      {/* Blood Group */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
          <Droplets className="h-2.5 w-2.5" />
          Blood
        </p>
        <p className="text-xs font-medium">
          {bloodGroup ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {bloodGroup}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </p>
      </div>

      {/* Last Visit */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
          <Calendar className="h-2.5 w-2.5" />
          Last Visit
        </p>
        {lastRx ? (
          <div>
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(lastRx.created_at), "MMM d")}
            </p>
            <p className="text-xs font-medium truncate">
              {lastRx.diagnosis || "—"}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">First visit</p>
        )}
      </div>

      {/* Chronic row with condition tags */}
      {hasChronic && (
        <div className="col-span-2 sm:col-span-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mb-0.5">
            <Heart className="h-2.5 w-2.5" />
            Chronic Conditions
          </p>
          <div className="flex flex-wrap gap-1">
            {detectChronicConditions(chronicDiseases).length > 0
              ? detectChronicConditions(chronicDiseases).map((c) => (
                  <Badge key={c} className={`text-[10px] px-1.5 py-0 h-4 ${CONDITION_COLORS[c].badge}`}>
                    {CONDITION_LABELS[c]}
                  </Badge>
                ))
              : <p className="text-xs">{chronicDiseases}</p>
            }
          </div>
        </div>
      )}
    </div>
  );
}
