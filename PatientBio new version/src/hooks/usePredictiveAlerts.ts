import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface PredictiveAlert {
  id: string;
  title: string;
  content: string;
  severity: string | null;
  metric_types: string[] | null;
  data_summary: Record<string, unknown> | null;
  is_read: boolean | null;
  generated_at: string;
}

export const usePredictiveAlerts = (patientId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetId = patientId || user?.id;

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["predictive-alerts", targetId],
    queryFn: async () => {
      if (!targetId) return [];

      const { data, error } = await supabase
        .from("health_insights")
        .select("*")
        .eq("user_id", targetId)
        .eq("insight_type", "prediction")
        .gte("expires_at", new Date().toISOString())
        .order("generated_at", { ascending: false });

      if (error) throw error;
      return data as PredictiveAlert[];
    },
    enabled: !!targetId,
  });

  const generatePredictions = useMutation({
    mutationFn: async (pid?: string) => {
      const { data, error } = await supabase.functions.invoke("predict-health-alerts", {
        body: { patient_id: pid || user?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["predictive-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["health-insights"] });
      toast({
        title: "Predictive Analysis Complete",
        description: `Found ${data?.predictions_count || 0} predictive alert(s)`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate predictions: " + error.message,
        variant: "destructive",
      });
    },
  });

  return {
    alerts,
    isLoading,
    generatePredictions,
    isGenerating: generatePredictions.isPending,
    hasAlerts: alerts.length > 0,
    criticalCount: alerts.filter(a => a.severity === "critical").length,
    warningCount: alerts.filter(a => a.severity === "warning").length,
  };
};
