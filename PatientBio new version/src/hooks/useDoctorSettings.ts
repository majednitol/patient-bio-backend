import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface DoctorSettings {
  id: string;
  user_id: string;
  default_consultation_minutes: number;
  timezone: string;
  email_digest_enabled: boolean;
  notification_new_patient: boolean;
  notification_appointment: boolean;
  notification_prescription: boolean;
  notification_referral: boolean;
  auto_reply_enabled: boolean;
  auto_reply_message: string;
  auto_confirm_appointments: boolean;
  buffer_minutes: number;
  max_appointments_per_day: number;
  min_advance_booking_hours: number;
  created_at: string;
  updated_at: string;
}

export function useDoctorSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["doctor-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("doctor_settings")
        .select("id, user_id, default_consultation_minutes, timezone, email_digest_enabled, notification_new_patient, notification_appointment, notification_prescription, notification_referral, auto_reply_enabled, auto_reply_message, auto_confirm_appointments, buffer_minutes, max_appointments_per_day, min_advance_booking_hours, created_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as DoctorSettings | null;
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.LONG,
  });

  const upsertSettings = useMutation({
    mutationFn: async (updates: Partial<DoctorSettings>) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("doctor_settings")
        .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-settings"] });
      toast({ title: "Settings saved", description: "Your preferences have been updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  return { settings, isLoading, upsertSettings };
}
