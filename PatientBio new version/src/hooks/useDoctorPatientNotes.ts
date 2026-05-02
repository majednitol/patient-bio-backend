import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface PatientNote {
  id: string;
  doctor_id: string;
  patient_id: string;
  note: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export const useDoctorPatientNotes = (patientId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["doctor-patient-notes", user?.id, patientId],
    queryFn: async (): Promise<PatientNote[]> => {
      if (!user?.id || !patientId) return [];

      const { data, error } = await supabase
        .from("doctor_patient_notes")
        .select("id, doctor_id, patient_id, note, is_pinned, created_at, updated_at")
        .eq("doctor_id", user.id)
        .eq("patient_id", patientId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as PatientNote[];
    },
    enabled: !!user?.id && !!patientId,
  });
};

export const useCreatePatientNote = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ patientId, note }: { patientId: string; note: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("doctor_patient_notes")
        .insert({
          doctor_id: user.id,
          patient_id: patientId,
          note,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["doctor-patient-notes", user?.id, variables.patientId] 
      });
      toast.success("Note added!");
    },
    onError: (error) => {
      toast.error("Failed to add note: " + error.message);
    },
  });
};

export const useUpdatePatientNote = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      noteId, 
      note, 
      is_pinned 
    }: { 
      noteId: string; 
      note?: string; 
      is_pinned?: boolean;
      patientId: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (note !== undefined) updates.note = note;
      if (is_pinned !== undefined) updates.is_pinned = is_pinned;

      const { error } = await supabase
        .from("doctor_patient_notes")
        .update(updates)
        .eq("id", noteId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["doctor-patient-notes", user?.id, variables.patientId] 
      });
    },
    onError: (error) => {
      toast.error("Failed to update note: " + error.message);
    },
  });
};

export const useDeletePatientNote = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ noteId, patientId }: { noteId: string; patientId: string }) => {
      const { error } = await supabase
        .from("doctor_patient_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
      return { patientId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["doctor-patient-notes", user?.id, variables.patientId] 
      });
      toast.success("Note deleted!");
    },
    onError: (error) => {
      toast.error("Failed to delete note: " + error.message);
    },
  });
};
