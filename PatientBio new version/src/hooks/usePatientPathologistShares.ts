import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface PatientPathologistShare {
  id: string;
  patient_id: string;
  pathologist_id: string;
  disease_category: string | null;
  notes: string | null;
  is_anonymized: boolean;
  status: "pending" | "viewed" | "completed" | "revoked";
  shared_at: string;
  expires_at: string | null;
  viewed_at: string | null;
  completed_at: string | null;
}

export const usePatientPathologistShares = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // For patients: Get shares they created
  const { data: patientShares = [], isLoading: loadingPatientShares, refetch: refetchPatientShares } = useQuery({
    queryKey: ["patient-pathologist-shares-patient", user?.id],
    queryFn: async (): Promise<PatientPathologistShare[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("patient_pathologist_shares")
        .select("*")
        .eq("patient_id", user.id)
        .order("shared_at", { ascending: false });
      if (error) { console.error("Error fetching patient pathologist shares:", error); return []; }
      return data as PatientPathologistShare[];
    },
    enabled: !!user?.id,
  });

  // For pathologists: Get shares assigned to them
  const { data: pathologistShares = [], isLoading: loadingPathologistShares, refetch: refetchPathologistShares } = useQuery({
    queryKey: ["patient-pathologist-shares-pathologist", user?.id],
    queryFn: async (): Promise<PatientPathologistShare[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("patient_pathologist_shares")
        .select("*")
        .eq("pathologist_id", user.id)
        .order("shared_at", { ascending: false });
      if (error) { console.error("Error fetching pathologist shares:", error); return []; }
      return data as PatientPathologistShare[];
    },
    enabled: !!user?.id,
  });

  const pendingShares = pathologistShares.filter((s) => s.status === "pending");
  const activePatientShares = patientShares.filter(
    (s) => s.status !== "revoked" && (!s.expires_at || new Date(s.expires_at) > new Date())
  );

  const createShare = useMutation({
    mutationFn: async (shareData: {
      pathologist_id: string;
      disease_category?: string;
      notes?: string;
      is_anonymized?: boolean;
      expires_at?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("patient_pathologist_shares")
        .insert({
          patient_id: user.id,
          pathologist_id: shareData.pathologist_id,
          disease_category: shareData.disease_category,
          notes: shareData.notes,
          is_anonymized: shareData.is_anonymized ?? true,
          expires_at: shareData.expires_at,
        })
        .select()
        .single();
      if (error) throw error;

      // Notify pathologist
      await supabase.from("notifications").insert({
        user_id: shareData.pathologist_id,
        type: "patient_data_shared",
        title: "New Patient Data Shared",
        message: "A patient has shared their health data with you.",
        metadata: { share_id: data.id, disease_category: shareData.disease_category },
      });

      return data;
    },
    onSuccess: () => {
      toast({ title: "Data Shared", description: "Your health data has been shared with the pathologist." });
      queryClient.invalidateQueries({ queryKey: ["patient-pathologist-shares-patient", user?.id] });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to share data. Please try again.", variant: "destructive" });
      console.error("Error creating pathologist share:", error);
    },
  });

  const revokeShare = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from("patient_pathologist_shares")
        .update({ status: "revoked" })
        .eq("id", shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Access Revoked", description: "Pathologist access has been revoked." });
      queryClient.invalidateQueries({ queryKey: ["patient-pathologist-shares-patient", user?.id] });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to revoke access. Please try again.", variant: "destructive" });
      console.error("Error revoking pathologist share:", error);
    },
  });

  const updateShareStatus = useMutation({
    mutationFn: async ({ shareId, status, completionNotes }: { shareId: string; status: string; completionNotes?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "viewed") updates.viewed_at = new Date().toISOString();
      if (status === "completed") {
        updates.completed_at = new Date().toISOString();
        if (completionNotes) updates.completion_notes = completionNotes;
      }
      const { error } = await supabase
        .from("patient_pathologist_shares")
        .update(updates)
        .eq("id", shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status Updated", description: "Share status has been updated." });
      queryClient.invalidateQueries({ queryKey: ["patient-pathologist-shares-pathologist", user?.id] });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
      console.error("Error updating pathologist share status:", error);
    },
  });

  return {
    patientShares,
    pathologistShares,
    activePatientShares,
    pendingShares,
    pendingCount: pendingShares.length,
    isLoading: loadingPatientShares || loadingPathologistShares,
    refetch: () => { refetchPatientShares(); refetchPathologistShares(); },
    createShare: createShare.mutate,
    revokeShare: revokeShare.mutate,
    updateShareStatus: updateShareStatus.mutate,
    isCreating: createShare.isPending,
    isRevoking: revokeShare.isPending,
    isUpdating: updateShareStatus.isPending,
  };
};
