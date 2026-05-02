import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useAverageConsultationDuration } from "./useAverageConsultationDuration";

interface QueuePositionData {
  position: number;
  totalWaiting: number;
  estimatedWaitMinutes: number | null;
  status: "not_in_queue" | "waiting" | "in_consultation";
  queueEntryId: string | null;
  doctorId: string | null;
  doctorRunningLate: boolean;
}

/**
 * Real-time queue position tracker for patients.
 * Returns the patient's current position in their doctor's queue
 * along with estimated wait time.
 */
export function useLiveQueuePosition(appointmentId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["live-queue-position", user?.id, appointmentId],
    enabled: !!user?.id,
    refetchInterval: 15000, // poll every 15s as fallback
    queryFn: async (): Promise<QueuePositionData> => {
      // Find the patient's queue entry
      let queueQuery = supabase
        .from("patient_queue")
        .select("id, patient_id, doctor_id, appointment_id, status, checked_in_at, called_at, completed_at, hospital_id")
        .eq("patient_id", user!.id)
        .in("status", ["waiting", "in_consultation"])
        .order("checked_in_at", { ascending: false })
        .limit(1);

      if (appointmentId) {
        queueQuery = supabase
          .from("patient_queue")
          .select("id, patient_id, doctor_id, appointment_id, status, checked_in_at, called_at, completed_at, hospital_id")
          .eq("appointment_id", appointmentId)
          .in("status", ["waiting", "in_consultation"])
          .limit(1);
      }

      const { data: myEntry, error } = await queueQuery.maybeSingle();
      if (error) throw error;

      if (!myEntry) {
        return {
          position: 0,
          totalWaiting: 0,
          estimatedWaitMinutes: null,
          status: "not_in_queue",
          queueEntryId: null,
          doctorId: null,
          doctorRunningLate: false,
        };
      }

      if (myEntry.status === "in_consultation") {
        return {
          position: 0,
          totalWaiting: 0,
          estimatedWaitMinutes: 0,
          status: "in_consultation",
          queueEntryId: myEntry.id,
          doctorId: myEntry.doctor_id,
          doctorRunningLate: false,
        };
      }

      // Count how many are ahead of this patient
      const { data: ahead, error: aheadError } = await supabase
        .from("patient_queue")
        .select("id")
        .eq("doctor_id", myEntry.doctor_id)
        .eq("status", "waiting")
        .lt("checked_in_at", myEntry.checked_in_at);

      if (aheadError) throw aheadError;

      // Check if someone is currently in consultation
      const { data: inConsult } = await supabase
        .from("patient_queue")
        .select("id")
        .eq("doctor_id", myEntry.doctor_id)
        .eq("status", "in_consultation")
        .limit(1);

      const { count: totalWaiting } = await supabase
        .from("patient_queue")
        .select("id", { count: "exact", head: true })
        .eq("doctor_id", myEntry.doctor_id)
        .eq("status", "waiting");

      const position = (ahead?.length || 0) + 1 + (inConsult?.length || 0 ? 1 : 0);

      // Get average consultation duration for this doctor
      const { data: recentAppts } = await supabase
        .from("appointments")
        .select("consultation_started_at, consultation_ended_at")
        .eq("doctor_id", myEntry.doctor_id)
        .not("consultation_started_at", "is", null)
        .not("consultation_ended_at", "is", null)
        .order("consultation_ended_at", { ascending: false })
        .limit(20);

      let avgMinutes = 15; // default
      if (recentAppts && recentAppts.length > 0) {
        const durations = recentAppts.map((a) => {
          const start = new Date(a.consultation_started_at!).getTime();
          const end = new Date(a.consultation_ended_at!).getTime();
          return (end - start) / 60000;
        });
        avgMinutes = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
      }

      const estimatedWaitMinutes = Math.max(0, (position - 1) * avgMinutes);

      // Check if doctor is running late (current consultation > 50% over average)
      let doctorRunningLate = false;
      if (inConsult && inConsult.length > 0) {
        const { data: currentConsult } = await supabase
          .from("patient_queue")
          .select("called_at")
          .eq("doctor_id", myEntry.doctor_id)
          .eq("status", "in_consultation")
          .limit(1)
          .maybeSingle();

        if (currentConsult?.called_at) {
          const consultMinutes = (Date.now() - new Date(currentConsult.called_at).getTime()) / 60000;
          doctorRunningLate = consultMinutes > avgMinutes * 1.5;
        }
      }

      return {
        position,
        totalWaiting: totalWaiting || 0,
        estimatedWaitMinutes,
        status: "waiting",
        queueEntryId: myEntry.id,
        doctorId: myEntry.doctor_id,
        doctorRunningLate,
      };
    },
  });

  // Real-time subscription for queue changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("patient-queue-position")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "patient_queue",
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["live-queue-position", user.id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}
