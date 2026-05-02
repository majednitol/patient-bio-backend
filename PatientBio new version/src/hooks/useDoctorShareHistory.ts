import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface DoctorShareHistory {
  id: string;
  user_id: string;
  doctor_id: string | null;
  token_id: string | null;
  shared_at: string;
  notes: string | null;
}

interface CreateShareHistoryParams {
  doctor_id: string;
  token_id: string;
  notes?: string;
}

export const useDoctorShareHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: shareHistory, isLoading } = useQuery({
    queryKey: ["doctor-share-history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("doctor_share_history")
        .select("*")
        .eq("user_id", user.id)
        .order("shared_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as DoctorShareHistory[];
    },
    enabled: !!user?.id,
  });

  const createShareHistoryMutation = useMutation({
    mutationFn: async ({ doctor_id, token_id, notes }: CreateShareHistoryParams) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("doctor_share_history")
        .insert({
          user_id: user.id,
          doctor_id,
          token_id,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DoctorShareHistory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-share-history", user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Record Share",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get share history for a specific doctor
  const getSharesForDoctor = (doctorId: string) => {
    return (shareHistory || []).filter((h) => h.doctor_id === doctorId);
  };

  return {
    shareHistory: shareHistory || [],
    isLoading,
    createShareHistory: createShareHistoryMutation.mutateAsync,
    isCreating: createShareHistoryMutation.isPending,
    getSharesForDoctor,
  };
};
