import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Medication } from "./usePrescriptions";
import type { Json } from "@/integrations/supabase/types";

export interface PrescriptionTemplate {
  id: string;
  doctor_id: string;
  name: string;
  diagnosis: string | null;
  medications: Medication[];
  instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  diagnosis?: string;
  medications: Medication[];
  instructions?: string;
}

export const usePrescriptionTemplates = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["prescription-templates", user?.id],
    queryFn: async (): Promise<PrescriptionTemplate[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("prescription_templates")
        .select("id, doctor_id, name, diagnosis, medications, instructions, created_at, updated_at")
        .eq("doctor_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      
      return (data || []).map(template => ({
        ...template,
        medications: Array.isArray(template.medications) 
          ? template.medications as unknown as Medication[]
          : [],
      }));
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.LONG,
  });
};

export const useCreatePrescriptionTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("prescription_templates")
        .insert([{
          doctor_id: user.id,
          name: input.name,
          diagnosis: input.diagnosis || null,
          medications: input.medications as unknown as Json,
          instructions: input.instructions || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescription-templates"] });
      toast.success("Template saved successfully!");
    },
    onError: (error) => {
      toast.error("Failed to save template: " + error.message);
    },
  });
};

export const useDeletePrescriptionTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("prescription_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescription-templates"] });
      toast.success("Template deleted!");
    },
    onError: (error) => {
      toast.error("Failed to delete template: " + error.message);
    },
  });
};
