import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";

export interface PatientBrief {
  lastVisitDate: string | null;
  activeMedicationsCount: number;
  pendingLabsCount: number;
  conditions: string[];
}

/**
 * Fetches a quick patient brief for display on appointment cards:
 * last visit, active medication count, pending lab results, flagged conditions.
 */
export function usePatientBrief(patientId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["patient-brief", patientId],
    enabled: !!patientId && enabled,
    staleTime: STALE_TIMES.LONG,
    queryFn: async () => {
      // Parallel queries
      const [lastVisitRes, medsRes, labsRes, conditionsRes] = await Promise.all([
        // Last completed appointment
        supabase
          .from("appointments")
          .select("appointment_date")
          .eq("patient_id", patientId!)
          .eq("status", "completed")
          .order("appointment_date", { ascending: false })
          .limit(1),
        // Active running treatments
        supabase
          .from("patient_running_treatments")
          .select("id")
          .eq("user_id", patientId!)
          .eq("is_active", true),
        // Pending lab orders (not yet resulted)
        supabase
          .from("health_records")
          .select("id")
          .eq("user_id", patientId!)
          .eq("category", "lab_result")
          .order("uploaded_at", { ascending: false })
          .limit(5),
        // Conditions from health records
        supabase
          .from("health_records")
          .select("disease_category")
          .eq("user_id", patientId!)
          .not("disease_category", "is", null)
          .order("uploaded_at", { ascending: false })
          .limit(5),
      ]);

      const lastVisit = lastVisitRes.data?.[0]?.appointment_date || null;
      const activeMeds = medsRes.data?.length || 0;
      const pendingLabs = labsRes.data?.length || 0;
      const conditionSet = new Set<string>();
      (conditionsRes.data || []).forEach((r) => {
        if (r.disease_category) conditionSet.add(r.disease_category);
      });

      return {
        lastVisitDate: lastVisit,
        activeMedicationsCount: activeMeds,
        pendingLabsCount: pendingLabs,
        conditions: Array.from(conditionSet).slice(0, 3),
      } as PatientBrief;
    },
  });
}
