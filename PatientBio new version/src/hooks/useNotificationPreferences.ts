import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface NotificationPreferences {
  data_access: boolean;
  emergency_access: boolean;
  prescriptions: boolean;
  appointments: boolean;
  requests: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  data_access: true,
  emergency_access: true,
  prescriptions: true,
  appointments: true,
  requests: true,
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("notification_push_enabled, notification_preferences")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching notification preferences:", error);
        return;
      }

      if (data) {
        setPushEnabled(data.notification_push_enabled ?? true);
        const prefs = data.notification_preferences as unknown as NotificationPreferences | null;
        setPreferences(prefs || DEFAULT_PREFERENCES);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    setSaving(true);

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ notification_preferences: newPreferences })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Preference Updated",
        description: `${key.replace("_", " ")} notifications ${value ? "enabled" : "disabled"}.`,
      });
    } catch (err) {
      console.error("Error updating preference:", err);
      // Revert on error
      setPreferences(preferences);
      toast({
        title: "Error",
        description: "Failed to update notification preference.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePushEnabled = async (enabled: boolean) => {
    if (!user) return;

    setPushEnabled(enabled);
    setSaving(true);

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ notification_push_enabled: enabled })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Push Notifications",
        description: enabled ? "Push notifications enabled." : "Push notifications disabled.",
      });
    } catch (err) {
      console.error("Error updating push preference:", err);
      setPushEnabled(!enabled);
      toast({
        title: "Error",
        description: "Failed to update push notification setting.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    preferences,
    pushEnabled,
    loading,
    saving,
    updatePreference,
    updatePushEnabled,
    refetch: fetchPreferences,
  };
};
