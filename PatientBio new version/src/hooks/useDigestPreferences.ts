import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface DigestPreferences {
  id: string;
  user_id: string;
  weekly_digest_enabled: boolean;
  preferred_day: number;
  preferred_hour: number;
  timezone: string;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`,
}));

export const useDigestPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["digest-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("patient_digest_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as DigestPreferences | null;
    },
    enabled: !!user?.id,
  });

  const upsertPreferences = useMutation({
    mutationFn: async (updates: Partial<DigestPreferences>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("patient_digest_preferences")
        .upsert({
          user_id: user.id,
          ...updates,
        }, {
          onConflict: "user_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["digest-preferences"] });
      toast({
        title: "Preferences saved",
        description: "Your email digest preferences have been updated.",
      });
    },
    onError: (error) => {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleDigest = async (enabled: boolean) => {
    await upsertPreferences.mutateAsync({ weekly_digest_enabled: enabled });
  };

  const updateDay = async (day: number) => {
    await upsertPreferences.mutateAsync({ preferred_day: day });
  };

  const updateHour = async (hour: number) => {
    await upsertPreferences.mutateAsync({ preferred_hour: hour });
  };

  return {
    preferences,
    isLoading,
    toggleDigest,
    updateDay,
    updateHour,
    isUpdating: upsertPreferences.isPending,
    DAYS_OF_WEEK,
    HOURS,
  };
};
