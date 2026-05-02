import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useCallback } from "react";
import { STALE_TIMES } from "@/lib/queryConfig";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCachedHealthData, cacheHealthData, addToSyncQueue } from "@/lib/offlineDB";
import { broadcastCacheUpdate, scheduleBatchedSyncToast, addSyncEvent } from "@/lib/syncUtils";

export interface HealthData {
  id: string;
  user_id: string;
  height: string | null;
  blood_group: string | null;
  previous_diseases: string | null;
  current_medications: string | null;
  bad_habits: string | null;
  chronic_diseases: string | null;
  health_allergies: string | null;
  birth_defects: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthDataUpdate {
  height?: string | null;
  blood_group?: string | null;
  previous_diseases?: string | null;
  current_medications?: string | null;
  bad_habits?: string | null;
  chronic_diseases?: string | null;
  health_allergies?: string | null;
  birth_defects?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  weight?: string | null;
  emergency_contact_relationship?: string | null;
}

export const useHealthData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const lastMutationAt = useRef<number>(0);

  const { data: healthData = null, isLoading: loading } = useQuery({
    queryKey: ["health-data", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      try {
        const { data, error } = await supabase
          .from("health_data")
          .select("id, user_id, height, blood_group, previous_diseases, current_medications, bad_habits, chronic_diseases, health_allergies, birth_defects, emergency_contact_name, emergency_contact_phone, created_at, updated_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          await cacheHealthData(user.id, {
            id: data.id,
            bloodGroup: data.blood_group,
            healthAllergies: data.health_allergies,
            currentMedications: data.current_medications,
            chronicDiseases: data.chronic_diseases,
            emergencyContactName: data.emergency_contact_name,
            emergencyContactPhone: data.emergency_contact_phone,
            height: data.height,
            updatedAt: data.updated_at,
          }).catch(() => {});
        }

        return data as HealthData | null;
      } catch (error) {
        if (!navigator.onLine) {
          const cached = await getCachedHealthData(user.id);
          if (cached) {
            return {
              id: cached.id,
              user_id: cached.userId,
              height: cached.height,
              blood_group: cached.bloodGroup,
              previous_diseases: null,
              current_medications: cached.currentMedications,
              bad_habits: null,
              chronic_diseases: cached.chronicDiseases,
              health_allergies: cached.healthAllergies,
              birth_defects: null,
              emergency_contact_name: cached.emergencyContactName,
              emergency_contact_phone: cached.emergencyContactPhone,
              created_at: cached.updatedAt,
              updated_at: cached.updatedAt,
            } as HealthData;
          }
        }
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
    retry: navigator.onLine ? 3 : 0,
  });

  const mutation = useMutation({
    mutationFn: async (updates: HealthDataUpdate) => {
      if (!user?.id) throw new Error("Not authenticated");

      if (!navigator.onLine) {
        const current = healthData;
        await cacheHealthData(user.id, {
          id: current?.id,
          bloodGroup: updates.blood_group !== undefined ? updates.blood_group : current?.blood_group,
          healthAllergies: updates.health_allergies !== undefined ? updates.health_allergies : current?.health_allergies,
          currentMedications: updates.current_medications !== undefined ? updates.current_medications : current?.current_medications,
          chronicDiseases: updates.chronic_diseases !== undefined ? updates.chronic_diseases : current?.chronic_diseases,
          emergencyContactName: updates.emergency_contact_name !== undefined ? updates.emergency_contact_name : current?.emergency_contact_name,
          emergencyContactPhone: updates.emergency_contact_phone !== undefined ? updates.emergency_contact_phone : current?.emergency_contact_phone,
          height: updates.height !== undefined ? updates.height : current?.height,
          updatedAt: new Date().toISOString(),
        });
        await addToSyncQueue("update_health_data", updates as Record<string, unknown>);
        return {
          ...(current || {}),
          ...updates,
          user_id: user.id,
          id: current?.id || crypto.randomUUID(),
          updated_at: new Date().toISOString(),
        };
      }

      lastMutationAt.current = Date.now();

      if (healthData) {
        const { data, error } = await supabase
          .from("health_data")
          .update(updates)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("health_data")
          .insert({ user_id: user.id, ...updates })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["health-data", user?.id], data);
      broadcastCacheUpdate("health_data", user?.id || "");
      addSyncEvent({ type: "outgoing", table: "health_data", detail: "Health data updated" });
      if (!navigator.onLine) {
        toast({
          title: t("pwa.savedOffline"),
          description: t("pwa.savedOfflineDesc"),
        });
      } else {
        toast({
          title: "Health Data Saved",
          description: "Your health information has been saved successfully.",
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: t("common.error"),
        description: err.message || "Failed to save health data.",
        variant: "destructive",
      });
    },
  });

  // Realtime subscription for cross-device sync
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`health-data-sync-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "health_data",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (Date.now() - lastMutationAt.current < 2000) return;

          const newData = payload.new as HealthData;
          if (newData && newData.user_id === user.id) {
            queryClient.setQueryData(["health-data", user.id], newData);

            // Update offline cache
            cacheHealthData(user.id, {
              id: newData.id,
              bloodGroup: newData.blood_group,
              healthAllergies: newData.health_allergies,
              currentMedications: newData.current_medications,
              chronicDiseases: newData.chronic_diseases,
              emergencyContactName: newData.emergency_contact_name,
              emergencyContactPhone: newData.emergency_contact_phone,
              height: newData.height,
              updatedAt: newData.updated_at,
            }).catch(() => {});

            addSyncEvent({ type: "incoming", table: "health_data", detail: "Health data synced from another device" });
            scheduleBatchedSyncToast(toast, t);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, t]);

  const updateHealthData = useCallback(
    async (updates: HealthDataUpdate) => {
      try {
        await mutation.mutateAsync(updates);
        return { error: null };
      } catch (err) {
        return { error: err };
      }
    },
    [mutation]
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["health-data", user?.id] });
  }, [queryClient, user?.id]);

  return {
    healthData,
    loading,
    saving: mutation.isPending,
    updateHealthData,
    refetch,
  };
};
