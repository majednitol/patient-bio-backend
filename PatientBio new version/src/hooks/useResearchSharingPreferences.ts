import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface ResearchSharingPreferences {
  id: string;
  user_id: string;
  share_vitals: boolean;
  share_prescriptions: boolean;
  share_lab_results: boolean;
  share_diagnoses: boolean;
  share_demographics: boolean;
  share_allergies: boolean;
  require_anonymization: boolean;
  notify_new_requests: boolean;
  notify_auto_approved: boolean;
  notify_earnings: boolean;
  notification_frequency: "immediate" | "daily" | "weekly";
  created_at: string;
  updated_at: string;
}

const DEFAULTS: Partial<ResearchSharingPreferences> = {
  share_vitals: true,
  share_prescriptions: true,
  share_lab_results: true,
  share_diagnoses: true,
  share_demographics: true,
  share_allergies: true,
  require_anonymization: true,
  notify_new_requests: true,
  notify_auto_approved: true,
  notify_earnings: true,
  notification_frequency: "immediate",
};

export function useResearchSharingPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["research-sharing-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("research_sharing_preferences")
        .select("id, user_id, share_vitals, share_prescriptions, share_lab_results, share_diagnoses, share_demographics, share_allergies, require_anonymization, notify_new_requests, notify_auto_approved, notify_earnings, notification_frequency, created_at, updated_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ResearchSharingPreferences | null;
    },
    enabled: !!user,
  });

  const upsert = useMutation({
    mutationFn: async (updates: Partial<ResearchSharingPreferences>) => {
      const existing = query.data;
      if (existing) {
        const { data, error } = await supabase
          .from("research_sharing_preferences")
          .update(updates)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("research_sharing_preferences")
          .insert({ user_id: user!.id, ...DEFAULTS, ...updates })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research-sharing-preferences"] });
      toast.success("Preferences saved");
    },
    onError: (err: Error) => {
      toast.error("Failed to save: " + err.message);
    },
  });

  const prefs = query.data ?? (DEFAULTS as ResearchSharingPreferences);

  return { preferences: prefs, isLoading: query.isLoading, upsert };
}
