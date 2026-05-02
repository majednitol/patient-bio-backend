import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format, startOfDay } from "date-fns";

export interface FollowUpGap {
  patientId: string;
  patientName: string;
  lastAppointmentDate: string;
  daysSinceVisit: number;
  reason: string | null;
}

/**
 * Finds patients whose last completed appointment was >14 days ago
 * and who have no upcoming scheduled/confirmed appointment with this doctor.
 */
export function useFollowUpGaps(doctorId: string | undefined) {
  return useQuery({
    queryKey: ["follow-up-gaps", doctorId],
    enabled: !!doctorId,
    staleTime: STALE_TIMES.LONG,
    queryFn: async () => {
      const today = format(startOfDay(new Date()), "yyyy-MM-dd");

      // Get all completed appointments for this doctor in last 90 days
      const { data: completed, error: e1 } = await supabase
        .from("appointments")
        .select("patient_id, appointment_date, reason, patient_profile:user_profiles!appointments_patient_id_fkey(display_name)")
        .eq("doctor_id", doctorId!)
        .eq("status", "completed")
        .gte("appointment_date", format(new Date(Date.now() - 90 * 86400000), "yyyy-MM-dd"))
        .order("appointment_date", { ascending: false });

      if (e1) throw e1;

      // Get patients with upcoming appointments
      const { data: upcoming, error: e2 } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("doctor_id", doctorId!)
        .gte("appointment_date", today)
        .in("status", ["scheduled", "confirmed"]);

      if (e2) throw e2;

      const upcomingPatientIds = new Set((upcoming || []).map((a) => a.patient_id));

      // Find most recent completed per patient
      const latestByPatient = new Map<string, typeof completed extends (infer T)[] ? T : never>();
      for (const appt of completed || []) {
        if (!latestByPatient.has(appt.patient_id)) {
          latestByPatient.set(appt.patient_id, appt);
        }
      }

      const gaps: FollowUpGap[] = [];
      for (const [patientId, appt] of latestByPatient) {
        if (upcomingPatientIds.has(patientId)) continue;
        const daysSince = differenceInDays(new Date(), new Date(appt.appointment_date));
        if (daysSince >= 14) {
          const profile = appt.patient_profile as { display_name: string | null } | null;
          gaps.push({
            patientId,
            patientName: profile?.display_name || "Unknown Patient",
            lastAppointmentDate: appt.appointment_date,
            daysSinceVisit: daysSince,
            reason: appt.reason,
          });
        }
      }

      return gaps.sort((a, b) => b.daysSinceVisit - a.daysSinceVisit).slice(0, 10);
    },
  });
}
