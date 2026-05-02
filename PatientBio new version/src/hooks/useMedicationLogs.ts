import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export interface MedicationLog {
  id: string;
  reminder_id: string;
  user_id: string;
  scheduled_for: string;
  status: string;
  sent_at: string | null;
  taken_at: string | null;
  skipped_reason: string | null;
  created_at: string;
  medication_reminders?: {
    medication_name: string;
    dosage: string | null;
  };
}

export const useMedicationLogs = (daysBack: number = 7) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch today's medication logs
  const { data: todayLogs, isLoading: todayLoading } = useQuery({
    queryKey: ["medication-logs-today", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const today = new Date();
      const start = startOfDay(today).toISOString();
      const end = endOfDay(today).toISOString();

      const { data, error } = await supabase
        .from("medication_reminder_logs")
        .select(`
          *,
          medication_reminders (
            medication_name,
            dosage
          )
        `)
        .eq("user_id", user.id)
        .gte("scheduled_for", start)
        .lte("scheduled_for", end)
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      return data as MedicationLog[];
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch history logs
  const { data: historyLogs, isLoading: historyLoading } = useQuery({
    queryKey: ["medication-logs-history", user?.id, daysBack],
    queryFn: async () => {
      if (!user?.id) return [];

      const end = endOfDay(new Date()).toISOString();
      const start = startOfDay(subDays(new Date(), daysBack)).toISOString();

      const { data, error } = await supabase
        .from("medication_reminder_logs")
        .select(`
          *,
          medication_reminders (
            medication_name,
            dosage
          )
        `)
        .eq("user_id", user.id)
        .gte("scheduled_for", start)
        .lte("scheduled_for", end)
        .order("scheduled_for", { ascending: false });

      if (error) throw error;
      return data as MedicationLog[];
    },
    enabled: !!user?.id,
  });

  // Mark medication as taken
  const markTaken = useMutation({
    mutationFn: async (logId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("medication_reminder_logs")
        .update({
          status: "taken",
          taken_at: new Date().toISOString(),
        })
        .eq("id", logId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-logs-today"] });
      queryClient.invalidateQueries({ queryKey: ["medication-logs-history"] });
      toast.success("Medication marked as taken! 💊");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  // Mark medication as skipped
  const markSkipped = useMutation({
    mutationFn: async ({ logId, reason }: { logId: string; reason?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("medication_reminder_logs")
        .update({
          status: "skipped",
          skipped_reason: reason || null,
        })
        .eq("id", logId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-logs-today"] });
      queryClient.invalidateQueries({ queryKey: ["medication-logs-history"] });
      toast.success("Medication skipped");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  // Calculate adherence stats
  const calculateAdherence = () => {
    if (!historyLogs || historyLogs.length === 0) {
      return { total: 0, taken: 0, missed: 0, skipped: 0, percentage: 0 };
    }

    const now = new Date();
    const pastLogs = historyLogs.filter(
      (log) => new Date(log.scheduled_for) <= now
    );

    const total = pastLogs.length;
    const taken = pastLogs.filter((log) => log.status === "taken").length;
    const missed = pastLogs.filter(
      (log) => log.status === "pending" || log.status === "sent" || log.status === "missed"
    ).length;
    const skipped = pastLogs.filter((log) => log.status === "skipped").length;
    const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;

    return { total, taken, missed, skipped, percentage };
  };

  // Get logs grouped by date for history view
  const getLogsByDate = () => {
    if (!historyLogs) return {};

    return historyLogs.reduce((acc, log) => {
      const date = format(new Date(log.scheduled_for), "yyyy-MM-dd");
      if (!acc[date]) acc[date] = [];
      acc[date].push(log);
      return acc;
    }, {} as Record<string, MedicationLog[]>);
  };

  // Get pending count for today
  const getPendingCount = () => {
    if (!todayLogs) return 0;
    const now = new Date();
    return todayLogs.filter(
      (log) =>
        (log.status === "pending" || log.status === "sent") &&
        new Date(log.scheduled_for) <= now
    ).length;
  };

  return {
    todayLogs: todayLogs || [],
    historyLogs: historyLogs || [],
    isLoading: todayLoading || historyLoading,
    markTaken,
    markSkipped,
    calculateAdherence,
    getLogsByDate,
    getPendingCount,
  };
};
