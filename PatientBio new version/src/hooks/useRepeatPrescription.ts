import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PrescriptionPrefillData } from "@/components/doctor/CreatePrescriptionDialog";

// Internal helper – re-export not needed
const parseMeds = (medications: any) => {
  if (!medications) return [];
  if (Array.isArray(medications)) return medications;
  return [];
};

export function useLatestPrescription(patientId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["latest-prescription", user?.id, patientId],
    queryFn: async () => {
      if (!user?.id || !patientId) return null;

      const { data, error } = await supabase
        .from("prescriptions")
        .select("diagnosis, medications, instructions, notes, chief_complaints, investigations, advice")
        .eq("doctor_id", user.id)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const meds = parseMeds(data.medications);

      return {
        diagnosis: data.diagnosis || undefined,
        medications: meds.map((m: any) => ({
          name: m.name || "",
          dosage: m.dosage || "",
          frequency: m.frequency || "",
          duration: m.duration || "",
          instructions: m.instructions,
          timingPattern: m.timingPattern,
        })),
        instructions: data.instructions || undefined,
        notes: data.notes || undefined,
        chief_complaints: data.chief_complaints || undefined,
        investigations: data.investigations || undefined,
        advice: data.advice || undefined,
      } as PrescriptionPrefillData;
    },
    enabled: !!user?.id && !!patientId,
    staleTime: STALE_TIMES.STANDARD,
  });
}