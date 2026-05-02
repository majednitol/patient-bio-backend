import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface MergeHistoryEntry {
  id: string;
  merge_candidate_id: string | null;
  kept_patient_id: string;
  merged_patient_id: string;
  merged_by: string;
  snapshot_before: Record<string, unknown>;
  records_moved: Record<string, unknown>;
  is_undone: boolean;
  undone_at: string | null;
  undone_by: string | null;
  undo_deadline: string;
  created_at: string;
}

export function useMergeHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ["merge-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_merge_history")
        .select("id, merge_candidate_id, kept_patient_id, merged_patient_id, merged_by, snapshot_before, records_moved, is_undone, undone_at, undone_by, undo_deadline, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as MergeHistoryEntry[];
    },
  });

  const undoMerge = useMutation({
    mutationFn: async (historyId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const entry = historyQuery.data?.find((h) => h.id === historyId);
      if (!entry) throw new Error("Merge history not found");

      if (entry.is_undone) throw new Error("This merge has already been undone");
      if (new Date(entry.undo_deadline) < new Date()) throw new Error("Undo deadline has passed (24 hours)");

      const recordsMoved = entry.records_moved as Record<string, string[]>;

      // Reverse: move records back from kept_patient to merged_patient
      if (recordsMoved.appointments?.length) {
        await supabase.from("appointments").update({ patient_id: entry.merged_patient_id }).in("id", recordsMoved.appointments);
      }
      if (recordsMoved.prescriptions?.length) {
        await supabase.from("prescriptions").update({ patient_id: entry.merged_patient_id }).in("id", recordsMoved.prescriptions);
      }
      if (recordsMoved.health_records?.length) {
        await supabase.from("health_records").update({ user_id: entry.merged_patient_id }).in("id", recordsMoved.health_records);
      }
      if (recordsMoved.invoices?.length) {
        await supabase.from("invoices").update({ patient_id: entry.merged_patient_id }).in("id", recordsMoved.invoices);
      }

      // Restore merged patient's display_name from snapshot
      const snapshot = entry.snapshot_before as Record<string, unknown>;
      if (snapshot.display_name) {
        await supabase.from("user_profiles").update({ display_name: snapshot.display_name as string }).eq("user_id", entry.merged_patient_id);
      }

      // Mark as undone
      await supabase.from("patient_merge_history").update({
        is_undone: true,
        undone_at: new Date().toISOString(),
        undone_by: user.id,
      }).eq("id", historyId);

      // Re-activate merge candidate if exists
      if (entry.merge_candidate_id) {
        await supabase.from("patient_merge_candidates").update({ status: "pending" }).eq("id", entry.merge_candidate_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merge-history"] });
      queryClient.invalidateQueries({ queryKey: ["merge-candidates"] });
      toast({ title: "Merge undone", description: "Records have been restored to their original patients." });
    },
    onError: (e: Error) => {
      toast({ title: "Undo failed", description: e.message, variant: "destructive" });
    },
  });

  return {
    history: historyQuery.data || [],
    isLoading: historyQuery.isLoading,
    undoMerge: undoMerge.mutate,
    isUndoing: undoMerge.isPending,
  };
}
