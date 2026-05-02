import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfDay, subDays, format } from "date-fns";

export interface MedicationStreak {
  current_streak: number;
  longest_streak: number;
  last_perfect_date: string | null;
  total_perfect_days: number;
  milestones_achieved: number[];
}

export const STREAK_MILESTONES = [
  { days: 3, label: "3-Day Start", emoji: "🌱" },
  { days: 7, label: "1 Week Strong", emoji: "💪" },
  { days: 14, label: "2 Week Warrior", emoji: "⚔️" },
  { days: 30, label: "Monthly Master", emoji: "🏆" },
  { days: 60, label: "60-Day Legend", emoji: "🔥" },
  { days: 90, label: "90-Day Champion", emoji: "👑" },
  { days: 180, label: "Half-Year Hero", emoji: "🌟" },
  { days: 365, label: "Year of Dedication", emoji: "💎" },
];

export const useMedicationStreaks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: streak, isLoading } = useQuery({
    queryKey: ["medication-streaks", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("medication_streaks")
        .select("current_streak, longest_streak, last_perfect_date, total_perfect_days, milestones_achieved")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as MedicationStreak | null;
    },
    enabled: !!user?.id,
  });

  // Recalculate streak from logs
  const recalculateStreak = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      // Get last 365 days of logs
      const start = startOfDay(subDays(new Date(), 365)).toISOString();
      const { data: logs, error: logsError } = await supabase
        .from("medication_reminder_logs")
        .select("scheduled_for, status")
        .eq("user_id", user.id)
        .gte("scheduled_for", start)
        .lte("scheduled_for", new Date().toISOString())
        .order("scheduled_for", { ascending: false });

      if (logsError) throw logsError;
      if (!logs || logs.length === 0) return;

      // Group by date and check if all taken
      const byDate: Record<string, { total: number; taken: number }> = {};
      for (const log of logs) {
        const date = format(new Date(log.scheduled_for), "yyyy-MM-dd");
        if (!byDate[date]) byDate[date] = { total: 0, taken: 0 };
        byDate[date].total++;
        if (log.status === "taken") byDate[date].taken++;
      }

      // Calculate current streak (consecutive perfect days from today backwards)
      let currentStreak = 0;
      const today = format(new Date(), "yyyy-MM-dd");
      let checkDate = new Date();

      for (let i = 0; i < 365; i++) {
        const dateStr = format(checkDate, "yyyy-MM-dd");
        const dayData = byDate[dateStr];

        // Skip today if no logs yet
        if (i === 0 && dateStr === today && (!dayData || dayData.total === 0)) {
          checkDate = subDays(checkDate, 1);
          continue;
        }

        if (dayData && dayData.total > 0 && dayData.taken === dayData.total) {
          currentStreak++;
        } else if (dayData && dayData.total > 0) {
          break; // Streak broken
        } else {
          // No logs for this day - might be a day without medications
          // Only break if the previous day had medications
          if (i > 0) break;
        }
        checkDate = subDays(checkDate, 1);
      }

      // Calculate total perfect days and longest streak
      let longestStreak = 0;
      let tempStreak = 0;
      let totalPerfect = 0;
      let lastPerfectDate: string | null = null;

      const sortedDates = Object.keys(byDate).sort();
      for (const date of sortedDates) {
        const day = byDate[date];
        if (day.total > 0 && day.taken === day.total) {
          totalPerfect++;
          tempStreak++;
          lastPerfectDate = date;
          if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else if (day.total > 0) {
          tempStreak = 0;
        }
      }

      // Determine milestones
      const milestones = STREAK_MILESTONES
        .filter((m) => longestStreak >= m.days)
        .map((m) => m.days);

      // Upsert streak
      const { error } = await supabase
        .from("medication_streaks")
        .upsert(
          {
            user_id: user.id,
            current_streak: currentStreak,
            longest_streak: Math.max(longestStreak, streak?.longest_streak || 0),
            last_perfect_date: lastPerfectDate,
            total_perfect_days: totalPerfect,
            milestones_achieved: milestones,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-streaks"] });
    },
  });

  const getNextMilestone = () => {
    const current = streak?.current_streak || 0;
    return STREAK_MILESTONES.find((m) => m.days > current) || null;
  };

  const getAchievedMilestones = () => {
    const achieved = streak?.milestones_achieved || [];
    return STREAK_MILESTONES.filter((m) => achieved.includes(m.days));
  };

  return {
    streak,
    isLoading,
    recalculateStreak,
    getNextMilestone,
    getAchievedMilestones,
  };
};
