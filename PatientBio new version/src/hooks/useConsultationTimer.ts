import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useStartConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({
          consultation_started_at: new Date().toISOString(),
          status: "confirmed" as const,
        })
        .eq("id", appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useEndConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({
          consultation_ended_at: new Date().toISOString(),
          status: "completed" as const,
        })
        .eq("id", appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

/**
 * Fetches the doctor's average consultation duration (in minutes)
 * based on completed appointments with both start and end timestamps.
 */
export function useDoctorAvgDuration(doctorId?: string) {
  return useQuery({
    queryKey: ["doctor-avg-duration", doctorId],
    queryFn: async () => {
      if (!doctorId) return null;

      const { data, error } = await supabase
        .from("appointments")
        .select("consultation_started_at, consultation_ended_at")
        .eq("doctor_id", doctorId)
        .eq("status", "completed")
        .not("consultation_started_at", "is", null)
        .not("consultation_ended_at", "is", null)
        .order("appointment_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data || data.length === 0) return 15; // default 15 min

      const durations = data.map((a) => {
        const start = new Date(a.consultation_started_at!).getTime();
        const end = new Date(a.consultation_ended_at!).getTime();
        return (end - start) / 60000; // minutes
      }).filter((d) => d > 0 && d < 120); // sanity filter

      if (durations.length === 0) return 15;
      return Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
    },
    enabled: !!doctorId,
    staleTime: STALE_TIMES.STANDARD,
  });
}

/**
 * Estimates wait time for a patient's appointment based on:
 * - How many appointments are ahead of them today
 * - The doctor's average consultation duration
 */
export function useEstimatedWaitTime(appointment?: {
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  status?: string;
}) {
  const { user } = useAuth();
  const { data: avgDuration } = useDoctorAvgDuration(appointment?.doctor_id);

  return useQuery({
    queryKey: ["estimated-wait", appointment?.doctor_id, appointment?.appointment_date, appointment?.start_time],
    queryFn: async () => {
      if (!appointment) return null;

      const todayStr = new Date().toISOString().split("T")[0];
      // Only show wait time for today's appointments
      if (appointment.appointment_date !== todayStr) return null;

      // Get appointments ahead of this one today
      const { data, error } = await supabase
        .from("appointments")
        .select("id, start_time, status, consultation_started_at, consultation_ended_at")
        .eq("doctor_id", appointment.doctor_id)
        .eq("appointment_date", todayStr)
        .in("status", ["scheduled", "confirmed"])
        .lt("start_time", appointment.start_time)
        .order("start_time");

      if (error) throw error;

      const pendingAhead = (data || []).filter(
        (a) => !a.consultation_ended_at
      ).length;

      if (pendingAhead === 0) return 0;

      const avg = avgDuration || 15;
      return pendingAhead * avg;
    },
    enabled: !!appointment && !!user,
    refetchInterval: 60000, // refresh every minute
  });
}
