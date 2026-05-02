import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TreatmentBrief {
  suggested_plan: string;
  contraindicated_medications: Array<{ name: string; reason: string }>;
  recommended_medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    reason: string;
  }>;
  recommended_lab_tests: string[];
  follow_up_timeline: string;
  key_considerations: string[];
}

export const useTreatmentInsights = () => {
  const mutation = useMutation({
    mutationFn: async ({ patientId, appointmentId }: { patientId: string; appointmentId?: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-treatment-insights", {
        body: { patient_id: patientId, appointment_id: appointmentId },
      });
      if (error) throw error;
      return data?.brief as TreatmentBrief | null;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate treatment insights: " + error.message,
        variant: "destructive",
      });
    },
  });

  return {
    brief: mutation.data ?? null,
    generate: mutation.mutate,
    isGenerating: mutation.isPending,
    isGenerated: mutation.isSuccess,
  };
};
