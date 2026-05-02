import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SymptomScreening {
  id: string;
  user_id: string;
  symptoms: string;
  duration: string | null;
  severity: string | null;
  urgency: string;
  urgency_label: string | null;
  summary: string | null;
  reasoning: string | null;
  recommendations: string[] | null;
  home_remedies: string[] | null;
  warning_signs: string[] | null;
  estimated_savings: string | null;
  booked_appointment: boolean;
  created_at: string;
}

export function useSymptomScreenings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const screeningsQuery = useQuery({
    queryKey: ["symptom-screenings", user?.id],
    queryFn: async (): Promise<SymptomScreening[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("symptom_screenings")
        .select("id, user_id, symptoms, duration, severity, urgency, urgency_label, summary, reasoning, recommendations, home_remedies, warning_signs, estimated_savings, booked_appointment, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as unknown as SymptomScreening[];
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  const saveScreening = useMutation({
    mutationFn: async (screening: {
      symptoms: string;
      duration?: string;
      severity?: string;
      urgency: string;
      urgency_label?: string;
      summary?: string;
      reasoning?: string;
      recommendations?: string[];
      home_remedies?: string[];
      warning_signs?: string[];
      estimated_savings?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("symptom_screenings")
        .insert({
          user_id: user.id,
          ...screening,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["symptom-screenings"] });
    },
  });

  const markAsBooked = useMutation({
    mutationFn: async (screeningId: string) => {
      const { error } = await supabase
        .from("symptom_screenings")
        .update({ booked_appointment: true } as any)
        .eq("id", screeningId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["symptom-screenings"] });
    },
  });

  return {
    screenings: screeningsQuery.data || [],
    isLoading: screeningsQuery.isLoading,
    saveScreening,
    markAsBooked,
  };
}
