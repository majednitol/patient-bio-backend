import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format, startOfDay } from "date-fns";

interface SlotRecommendation {
  date: string;
  dayLabel: string;
  appointmentCount: number;
  load: "low" | "medium" | "high";
  morningCount: number;
  afternoonCount: number;
}

/**
 * Analyzes appointment density for the next 14 days for a given doctor
 * and returns slot recommendations with load levels and time-of-day breakdown.
 */
export function useSlotRecommendations(doctorId: string | undefined) {
  return useQuery({
    queryKey: ["slot-recommendations", doctorId],
    enabled: !!doctorId,
    staleTime: STALE_TIMES.SHORT,
    queryFn: async () => {
      const today = startOfDay(new Date());
      const endDate = addDays(today, 14);

      const { data, error } = await supabase
        .from("appointments")
        .select("appointment_date, start_time")
        .eq("doctor_id", doctorId!)
        .gte("appointment_date", format(today, "yyyy-MM-dd"))
        .lte("appointment_date", format(endDate, "yyyy-MM-dd"))
        .not("status", "in", '("cancelled")');

      if (error) throw error;

      // Count appointments per day with time-of-day breakdown
      const countByDate: Record<string, { total: number; morning: number; afternoon: number }> = {};
      for (let i = 1; i <= 14; i++) {
        const d = format(addDays(today, i), "yyyy-MM-dd");
        countByDate[d] = { total: 0, morning: 0, afternoon: 0 };
      }
      (data || []).forEach((a) => {
        const entry = countByDate[a.appointment_date];
        if (entry !== undefined) {
          entry.total++;
          // Morning = before 12:00, Afternoon = 12:00+
          const hour = parseInt(a.start_time?.split(":")[0] || "12", 10);
          if (hour < 12) entry.morning++;
          else entry.afternoon++;
        }
      });

      // Calculate thresholds
      const counts = Object.values(countByDate).map((c) => c.total);
      const avg = counts.reduce((s, c) => s + c, 0) / counts.length || 1;

      const recommendations: SlotRecommendation[] = Object.entries(countByDate)
        .map(([date, counts]) => ({
          date,
          dayLabel: format(new Date(date), "EEE, MMM d"),
          appointmentCount: counts.total,
          morningCount: counts.morning,
          afternoonCount: counts.afternoon,
          load: counts.total <= avg * 0.5 ? "low" as const
            : counts.total >= avg * 1.5 ? "high" as const
            : "medium" as const,
        }))
        .sort((a, b) => a.appointmentCount - b.appointmentCount);

      // Top 3 suggested (lowest load)
      const suggested = recommendations.slice(0, 3).map((r) => r.date);

      // Flatten countByDate for backward compat
      const flatCountByDate: Record<string, number> = {};
      Object.entries(countByDate).forEach(([d, c]) => { flatCountByDate[d] = c.total; });

      return { recommendations, suggested, countByDate: flatCountByDate };
    },
  });
}
