import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface DoctorResearcherShare {
  id: string;
  doctor_id: string;
  researcher_id: string;
  patient_id: string;
  prescription_id: string | null;
  disease_category: string | null;
  research_purpose: string | null;
  notes: string | null;
  status: string;
  is_anonymized: boolean;
  shared_at: string;
  completed_at: string | null;
}

export const useDoctorResearcherShares = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // For researchers: Get shares assigned to them
  const { data: incomingShares = [], isLoading: loadingIncoming, refetch: refetchIncoming } = useQuery({
    queryKey: ["doctor-researcher-shares-incoming", user?.id],
    queryFn: async (): Promise<DoctorResearcherShare[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("doctor_researcher_shares")
        .select("id, doctor_id, researcher_id, patient_id, prescription_id, disease_category, research_purpose, notes, status, is_anonymized, shared_at, completed_at")
        .eq("researcher_id", user.id)
        .order("shared_at", { ascending: false });

      if (error) {
        console.error("Error fetching incoming shares:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  // For doctors: Get shares they created
  const { data: outgoingShares = [], isLoading: loadingOutgoing, refetch: refetchOutgoing } = useQuery({
    queryKey: ["doctor-researcher-shares-outgoing", user?.id],
    queryFn: async (): Promise<DoctorResearcherShare[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("doctor_researcher_shares")
        .select("id, doctor_id, researcher_id, patient_id, prescription_id, disease_category, research_purpose, notes, status, is_anonymized, shared_at, completed_at")
        .eq("doctor_id", user.id)
        .order("shared_at", { ascending: false });

      if (error) {
        console.error("Error fetching outgoing shares:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  const pendingShares = incomingShares.filter((s) => s.status === "pending");

  // Doctor creates a share to researcher
  const createShare = useMutation({
    mutationFn: async (shareData: {
      researcher_id: string;
      patient_id: string;
      prescription_id?: string;
      disease_category?: string;
      research_purpose?: string;
      notes?: string;
      is_anonymized?: boolean;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("doctor_researcher_shares")
        .insert({
          doctor_id: user.id,
          researcher_id: shareData.researcher_id,
          patient_id: shareData.patient_id,
          prescription_id: shareData.prescription_id,
          disease_category: shareData.disease_category,
          research_purpose: shareData.research_purpose,
          notes: shareData.notes,
          is_anonymized: shareData.is_anonymized ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      // Notify researcher
      await supabase.from("notifications").insert({
        user_id: shareData.researcher_id,
        type: "research_data_shared",
        title: "New Research Data Available",
        message: `A doctor has shared patient data for research purposes.`,
        metadata: { share_id: data.id, disease_category: shareData.disease_category },
      });

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Data Shared",
        description: "Patient data has been shared with the researcher.",
      });
      queryClient.invalidateQueries({ queryKey: ["doctor-researcher-shares-outgoing", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to share data. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating share:", error);
    },
  });

  // Researcher updates share status
  const updateShareStatus = useMutation({
    mutationFn: async ({ shareId, status }: { shareId: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "completed") {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("doctor_researcher_shares")
        .update(updates)
        .eq("id", shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Share status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["doctor-researcher-shares-incoming", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating share status:", error);
    },
  });

  return {
    incomingShares,
    outgoingShares,
    pendingShares,
    pendingCount: pendingShares.length,
    isLoading: loadingIncoming || loadingOutgoing,
    refetch: () => {
      refetchIncoming();
      refetchOutgoing();
    },
    createShare: createShare.mutate,
    updateShareStatus: updateShareStatus.mutate,
    isCreating: createShare.isPending,
    isUpdating: updateShareStatus.isPending,
  };
};
