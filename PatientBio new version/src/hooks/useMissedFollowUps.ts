import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";

export interface MissedFollowUp {
  prescriptionId: string;
  patientId: string;
  patientName: string;
  diagnosis: string | null;
  followUpDate: string;
  daysPastDue: number;
  lastVisitDate: string;
}

/**
 * Finds patients with a follow_up_date in the past (within 90 days)
 * who have NO upcoming appointment with this doctor.
 */
export function useMissedFollowUps() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["missed-follow-ups", user?.id],
    queryFn: async (): Promise<MissedFollowUp[]> => {
      if (!user?.id) return [];

      const today = format(new Date(), "yyyy-MM-dd");
      const ninetyDaysAgo = format(subDays(new Date(), 90), "yyyy-MM-dd");

      // Get prescriptions with past follow_up_date
      const { data: rxWithFollowUp, error: rxError } = await supabase
        .from("prescriptions")
        .select("id, patient_id, diagnosis, follow_up_date, created_at")
        .eq("doctor_id", user.id)
        .not("follow_up_date", "is", null)
        .lt("follow_up_date", today)
        .gte("follow_up_date", ninetyDaysAgo)
        .order("follow_up_date", { ascending: false });

      if (rxError) throw rxError;
      if (!rxWithFollowUp || rxWithFollowUp.length === 0) return [];

      // Deduplicate: keep only the most recent follow-up per patient
      const latestPerPatient = new Map<string, typeof rxWithFollowUp[0]>();
      for (const rx of rxWithFollowUp) {
        if (!latestPerPatient.has(rx.patient_id)) {
          latestPerPatient.set(rx.patient_id, rx);
        }
      }

      const patientIds = [...latestPerPatient.keys()];

      // Check which patients have upcoming appointments with this doctor
      const { data: upcomingApts } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("doctor_id", user.id)
        .gte("appointment_date", today)
        .in("patient_id", patientIds)
        .in("status", ["scheduled", "confirmed"]);

      const patientsWithUpcoming = new Set(
        (upcomingApts || []).map((a) => a.patient_id)
      );

      // Filter out patients who already have an appointment
      const missedPatientIds = patientIds.filter(
        (id) => !patientsWithUpcoming.has(id)
      );

      if (missedPatientIds.length === 0) return [];

      // Fetch patient names
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", missedPatientIds);

      const nameMap = new Map(
        (profiles || []).map((p) => [p.user_id, p.display_name])
      );

      const todayDate = new Date();

      return missedPatientIds.map((pid) => {
        const rx = latestPerPatient.get(pid)!;
        const followDate = new Date(rx.follow_up_date!);
        const daysPast = Math.floor(
          (todayDate.getTime() - followDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          prescriptionId: rx.id,
          patientId: pid,
          patientName: nameMap.get(pid) || "Unknown Patient",
          diagnosis: rx.diagnosis,
          followUpDate: rx.follow_up_date!,
          daysPastDue: daysPast,
          lastVisitDate: rx.created_at,
        };
      }).sort((a, b) => b.daysPastDue - a.daysPastDue);
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });
}
