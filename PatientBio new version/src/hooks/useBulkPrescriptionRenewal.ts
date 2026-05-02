/**
 * useBulkPrescriptionRenewal
 * Fetches the doctor's active prescriptions grouped by patient,
 * identifies chronic/renewable candidates, and provides a batch renewal mutation.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Medication } from "@/hooks/usePrescriptions";
import type { Json } from "@/integrations/supabase/types";

export interface RenewablePatient {
  patient_id: string;
  patient_name: string | null;
  prescription_id: string;
  diagnosis: string | null;
  medications: Medication[];
  instructions: string | null;
  notes: string | null;
  hospital_id: string | null;
  created_at: string;
  follow_up_date: string | null;
}

const parseMeds = (medications: Json | null): Medication[] => {
  if (!medications) return [];
  if (Array.isArray(medications)) return medications as unknown as Medication[];
  return [];
};

/**
 * Fetch doctor's active prescriptions (one per patient - the latest),
 * to present as renewal candidates.
 */
export function useRenewablePrescriptions(hospitalId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["renewable-prescriptions", user?.id, hospitalId],
    queryFn: async (): Promise<RenewablePatient[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from("prescriptions")
        .select("id, patient_id, doctor_id, hospital_id, diagnosis, medications, instructions, notes, is_active, created_at, follow_up_date")
        .eq("doctor_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (hospitalId) {
        query = query.eq("hospital_id", hospitalId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group by patient, take latest per patient
      const byPatient = new Map<string, typeof data[0]>();
      for (const rx of data) {
        if (!byPatient.has(rx.patient_id)) {
          byPatient.set(rx.patient_id, rx);
        }
      }

      // Fetch patient names
      const patientIds = [...byPatient.keys()];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", patientIds);

      const nameMap = new Map(
        (profiles || []).map((p) => [p.user_id, p.display_name])
      );

      return patientIds.map((pid) => {
        const rx = byPatient.get(pid)!;
        return {
          patient_id: pid,
          patient_name: nameMap.get(pid) || null,
          prescription_id: rx.id,
          diagnosis: rx.diagnosis,
          medications: parseMeds(rx.medications),
          instructions: rx.instructions,
          notes: rx.notes,
          hospital_id: rx.hospital_id,
          created_at: rx.created_at!,
          follow_up_date: rx.follow_up_date,
        };
      });
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.SHORT,
  });
}

/**
 * Batch-renew prescriptions: creates new prescriptions cloned from the selected ones.
 */
export function useBulkRenewPrescriptions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (patients: RenewablePatient[]) => {
      if (!user?.id) throw new Error("Not authenticated");

      const inserts = patients.map((p) => ({
        patient_id: p.patient_id,
        doctor_id: user.id,
        hospital_id: p.hospital_id,
        diagnosis: p.diagnosis,
        medications: p.medications as unknown as Json,
        instructions: p.instructions,
        notes: p.notes ? `[Renewed] ${p.notes}` : "[Renewed]",
        is_active: true,
      }));

      const { error } = await supabase.from("prescriptions").insert(inserts);
      if (error) throw error;

      return patients.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["renewable-prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["patient-prescriptions"] });
      toast.success(`${count} prescription${count > 1 ? "s" : ""} renewed successfully!`);
    },
    onError: (error: Error) => {
      toast.error("Failed to renew prescriptions: " + error.message);
    },
  });
}
