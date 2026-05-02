import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay } from "date-fns";

/**
 * Estimates wait time for a given queue position based on
 * the doctor's average consultation duration from last 20 completed appointments.
 */
export function useEstimatedWait(doctorId: string | undefined, queuePosition: number) {
  return useQuery({
    queryKey: ["estimated-wait", doctorId, queuePosition],
    enabled: !!doctorId && queuePosition > 0,
    staleTime: STALE_TIMES.LONG,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("consultation_started_at, consultation_ended_at")
        .eq("doctor_id", doctorId!)
        .not("consultation_started_at", "is", null)
        .not("consultation_ended_at", "is", null)
        .order("consultation_ended_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data || data.length === 0) return { avgMinutes: 15, estimatedMinutes: queuePosition * 15 };

      const durations = data.map((a) => {
        const start = new Date(a.consultation_started_at!).getTime();
        const end = new Date(a.consultation_ended_at!).getTime();
        return (end - start) / 60000;
      });

      const avg = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
      return { avgMinutes: avg, estimatedMinutes: queuePosition * avg };
    },
  });
}

/**
 * Returns the queue position for an appointment on today's schedule.
 */
export function useQueuePosition(doctorId: string | undefined, appointmentStartTime: string) {
  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  
  return useQuery({
    queryKey: ["queue-position", doctorId, today, appointmentStartTime],
    enabled: !!doctorId,
    staleTime: STALE_TIMES.SHORT,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("start_time")
        .eq("doctor_id", doctorId!)
        .eq("appointment_date", today)
        .in("status", ["scheduled", "confirmed"])
        .order("start_time", { ascending: true });

      if (error) throw error;
      const idx = (data || []).findIndex((a) => a.start_time >= appointmentStartTime);
      return idx >= 0 ? idx + 1 : (data || []).length + 1;
    },
  });
}
