import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";

export interface NoShowRisk {
  patientId: string;
  riskLevel: "low" | "medium" | "high";
  riskScore: number; // 0-100
  factors: string[];
}

/**
 * Analyzes patient appointment history to predict no-show risk.
 * Factors: previous no-shows, cancellation rate, early morning/late appointments.
 */
export function useNoShowPrediction(
  patientIds: string[],
  doctorId: string | undefined
) {
  return useQuery({
    queryKey: ["no-show-prediction", doctorId, ...patientIds.sort()],
    enabled: !!doctorId && patientIds.length > 0,
    staleTime: STALE_TIMES.STANDARD,
    queryFn: async () => {
      // Fetch historical appointments for these patients with this doctor
      const { data, error } = await supabase
        .from("appointments")
        .select("patient_id, status, start_time, appointment_date")
        .eq("doctor_id", doctorId!)
        .in("patient_id", patientIds)
        .lt("appointment_date", new Date().toISOString().split("T")[0]);

      if (error) throw error;

      // Group by patient
      const byPatient: Record<string, typeof data> = {};
      patientIds.forEach((id) => (byPatient[id] = []));
      (data || []).forEach((a) => {
        if (!byPatient[a.patient_id]) byPatient[a.patient_id] = [];
        byPatient[a.patient_id].push(a);
      });

      const predictions: Record<string, NoShowRisk> = {};

      for (const [patientId, history] of Object.entries(byPatient)) {
        const factors: string[] = [];
        let score = 0;
        const total = history.length;

        if (total === 0) {
          // New patient — slight elevated risk
          score += 15;
          factors.push("First visit");
        } else {
          // No-show rate
          const noShows = history.filter((a) => a.status === "no_show").length;
          const noShowRate = noShows / total;
          if (noShowRate > 0.3) {
            score += 40;
            factors.push(`${Math.round(noShowRate * 100)}% no-show history`);
          } else if (noShowRate > 0.1) {
            score += 20;
            factors.push(`${Math.round(noShowRate * 100)}% no-show history`);
          }

          // Cancellation rate
          const cancellations = history.filter((a) => a.status === "cancelled").length;
          const cancelRate = cancellations / total;
          if (cancelRate > 0.3) {
            score += 20;
            factors.push("Frequent cancellations");
          } else if (cancelRate > 0.15) {
            score += 10;
            factors.push("Some cancellations");
          }

          // Recent no-shows (last 3 appointments)
          const recent = history
            .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))
            .slice(0, 3);
          const recentNoShows = recent.filter((a) => a.status === "no_show").length;
          if (recentNoShows >= 2) {
            score += 25;
            factors.push("Recent no-shows");
          }
        }

        // Clamp to 0-100
        score = Math.min(100, Math.max(0, score));

        predictions[patientId] = {
          patientId,
          riskScore: score,
          riskLevel: score >= 50 ? "high" : score >= 25 ? "medium" : "low",
          factors,
        };
      }

      return predictions;
    },
  });
}
