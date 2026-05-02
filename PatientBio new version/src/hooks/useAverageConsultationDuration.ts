import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the average consultation duration in minutes
 * based on the doctor's last 20 completed consultations.
 */
export function useAverageConsultationDuration() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["avg-consultation-duration", user?.id],
    enabled: !!user?.id,
    staleTime: STALE_TIMES.LONG,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("consultation_started_at, consultation_ended_at")
        .eq("doctor_id", user!.id)
        .not("consultation_started_at", "is", null)
        .not("consultation_ended_at", "is", null)
        .order("consultation_ended_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const durations = data.map((a) => {
        const start = new Date(a.consultation_started_at!).getTime();
        const end = new Date(a.consultation_ended_at!).getTime();
        return (end - start) / 60000; // minutes
      });

      const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
      return Math.round(avg * 10) / 10; // 1 decimal
    },
  });
}
