import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface ReminderPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  reminder_hours: number[];
  created_at: string;
  updated_at: string;
}

export function useReminderPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: ["reminder-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_reminder_preferences")
        .select("id, user_id, email_enabled, sms_enabled, reminder_hours, created_at, updated_at")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as ReminderPreferences | null;
    },
    enabled: !!user,
  });

  const upsertPreferences = useMutation({
    mutationFn: async (prefs: Partial<ReminderPreferences>) => {
      const existing = preferencesQuery.data;

      if (existing) {
        const { data, error } = await supabase
          .from("appointment_reminder_preferences")
          .update({
            ...prefs,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("appointment_reminder_preferences")
          .insert({
            user_id: user!.id,
            email_enabled: prefs.email_enabled ?? true,
            sms_enabled: prefs.sms_enabled ?? false,
            reminder_hours: prefs.reminder_hours ?? [24],
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder-preferences"] });
      toast.success("Reminder preferences saved");
    },
    onError: (error) => {
      toast.error("Failed to save preferences: " + error.message);
    },
  });

  return {
    preferences: preferencesQuery.data,
    isLoading: preferencesQuery.isLoading,
    upsertPreferences,
  };
}
