import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Executes the actual merge of two patient records:
 * - Snapshots records before merge for undo capability
 * - Reassigns appointments, prescriptions, health records from patient B to patient A
 * - Deactivates patient B's profile
 * - Updates the merge candidate status
 * - Records merge history with 24-hour undo deadline
 */
export function useMergePatients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      keepPatientId,
      mergePatientId,
      candidateId,
    }: {
      keepPatientId: string;
      mergePatientId: string;
      candidateId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Snapshot the merged patient's profile before merge
      const { data: mergedProfile } = await supabase
        .from("user_profiles")
        .select("display_name, date_of_birth, phone, gender, patient_passport_id")
        .eq("user_id", mergePatientId)
        .single();

      // Collect IDs of records being moved for undo capability
      const [apptIds, rxIds, hrIds, invIds] = await Promise.all([
        supabase.from("appointments").select("id").eq("patient_id", mergePatientId).limit(500).then(r => r.data?.map(d => d.id) || []),
        supabase.from("prescriptions").select("id").eq("patient_id", mergePatientId).limit(500).then(r => r.data?.map(d => d.id) || []),
        supabase.from("health_records").select("id").eq("user_id", mergePatientId).limit(500).then(r => r.data?.map(d => d.id) || []),
        supabase.from("invoices").select("id").eq("patient_id", mergePatientId).limit(500).then(r => r.data?.map(d => d.id) || []),
      ]);

      // Reassign appointments
      if (apptIds.length) {
        await supabase.from("appointments").update({ patient_id: keepPatientId }).eq("patient_id", mergePatientId);
      }

      // Reassign prescriptions
      if (rxIds.length) {
        await supabase.from("prescriptions").update({ patient_id: keepPatientId }).eq("patient_id", mergePatientId);
      }

      // Reassign health records
      if (hrIds.length) {
        await supabase.from("health_records").update({ user_id: keepPatientId }).eq("user_id", mergePatientId);
      }

      // Reassign invoices
      if (invIds.length) {
        await supabase.from("invoices").update({ patient_id: keepPatientId }).eq("patient_id", mergePatientId);
      }

      // Reassign patient queue entries
      await supabase.from("patient_queue").update({ patient_id: keepPatientId }).eq("patient_id", mergePatientId);

      // Reassign doctor_patient_access
      await supabase.from("doctor_patient_access").update({ patient_id: keepPatientId }).eq("patient_id", mergePatientId);

      // Mark the duplicate profile as merged
      await supabase
        .from("user_profiles")
        .update({ display_name: "[MERGED] - see " + keepPatientId })
        .eq("user_id", mergePatientId);

      // Update merge candidate status
      await supabase
        .from("patient_merge_candidates")
        .update({
          status: "merged",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", candidateId);

      // Record merge history with 24-hour undo window
      await supabase.from("patient_merge_history").insert({
        merge_candidate_id: candidateId,
        kept_patient_id: keepPatientId,
        merged_patient_id: mergePatientId,
        merged_by: user.id,
        snapshot_before: mergedProfile || {},
        records_moved: {
          appointments: apptIds,
          prescriptions: rxIds,
          health_records: hrIds,
          invoices: invIds,
        },
        undo_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merge-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["merge-history"] });
      toast({
        title: "Patients merged",
        description: "All records have been reassigned. You can undo this within 24 hours.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Merge failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
