import { useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { STALE_TIMES } from "@/lib/queryConfig";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCachedUserProfile, cacheUserProfile, addToSyncQueue } from "@/lib/offlineDB";
import { broadcastCacheUpdate, scheduleBatchedSyncToast, addSyncEvent } from "@/lib/syncUtils";

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  location: string | null;
  phone: string | null;
  notification_email_enabled: boolean;
  patient_passport_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdate {
  display_name?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  location?: string | null;
  phone?: string | null;
  notification_email_enabled?: boolean;
  occupation?: string | null;
  address?: string | null;
  national_id?: string | null;
}

const cacheProfileToIDB = (userId: string, data: UserProfile) =>
  cacheUserProfile(userId, {
    id: data.id,
    displayName: data.display_name,
    dateOfBirth: data.date_of_birth,
    gender: data.gender,
    location: data.location,
    phone: data.phone,
    patientPassportId: data.patient_passport_id,
    avatarUrl: data.avatar_url,
    updatedAt: data.updated_at,
  }).catch(() => {});

export const useUserProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const lastMutationAt = useRef<number>(0);

  // ── Query ──
  const { data: profile = null, isLoading: loading } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("id, user_id, display_name, avatar_url, date_of_birth, gender, location, phone, notification_email_enabled, patient_passport_id, created_at, updated_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (data) await cacheProfileToIDB(user.id, data as UserProfile);
        return (data as UserProfile | null);
      } catch (err) {
        if (!navigator.onLine) {
          const cached = await getCachedUserProfile(user.id);
          if (cached) {
            return {
              id: cached.id,
              user_id: cached.userId,
              display_name: cached.displayName,
              avatar_url: cached.avatarUrl,
              date_of_birth: cached.dateOfBirth,
              gender: cached.gender,
              location: cached.location,
              phone: cached.phone,
              notification_email_enabled: true,
              patient_passport_id: cached.patientPassportId,
              created_at: cached.updatedAt,
              updated_at: cached.updatedAt,
            } as UserProfile;
          }
        }
        throw err;
      }
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
    retry: navigator.onLine ? 3 : 0,
  });

  // ── Mutation ──
  const mutation = useMutation({
    mutationFn: async (updates: UserProfileUpdate) => {
      if (!user?.id) throw new Error("Not authenticated");

      if (!navigator.onLine) {
        const current = profile;
        const mergedCache = {
          id: current?.id || crypto.randomUUID(),
          displayName: updates.display_name !== undefined ? updates.display_name : current?.display_name,
          dateOfBirth: updates.date_of_birth !== undefined ? updates.date_of_birth : current?.date_of_birth,
          gender: updates.gender !== undefined ? updates.gender : current?.gender,
          location: updates.location !== undefined ? updates.location : current?.location,
          phone: updates.phone !== undefined ? updates.phone : current?.phone,
          patientPassportId: current?.patient_passport_id,
          avatarUrl: updates.avatar_url !== undefined ? updates.avatar_url : current?.avatar_url,
          updatedAt: new Date().toISOString(),
        };
        await cacheUserProfile(user.id, mergedCache);
        await addToSyncQueue("update_profile", updates as Record<string, unknown>);
        return {
          ...(current || {}),
          ...updates,
          user_id: user.id,
          id: current?.id || crypto.randomUUID(),
          updated_at: new Date().toISOString(),
        } as UserProfile;
      }

      lastMutationAt.current = Date.now();

      if (profile) {
        const { data, error } = await supabase
          .from("user_profiles")
          .update(updates)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        return data as UserProfile;
      } else {
        const { data, error } = await supabase
          .from("user_profiles")
          .insert({ user_id: user.id, ...updates })
          .select()
          .single();
        if (error) throw error;
        return data as UserProfile;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["user-profile", user?.id], data);
      broadcastCacheUpdate("user_profiles", user?.id || "");
      addSyncEvent({ type: "outgoing", table: "user_profiles", detail: "Profile updated" });
      if (!navigator.onLine) {
        toast({ title: t("pwa.savedOffline"), description: t("pwa.savedOfflineDesc") });
      } else {
        toast({ title: "Profile Updated", description: "Your profile has been saved successfully." });
      }
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message || "Failed to save profile.", variant: "destructive" });
    },
  });

  // ── Realtime subscription ──
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-sync-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (Date.now() - lastMutationAt.current < 2000) return;
          const newData = payload.new as UserProfile;
          if (newData && newData.user_id === user.id) {
            queryClient.setQueryData(["user-profile", user.id], newData);
            cacheProfileToIDB(user.id, newData);
            broadcastCacheUpdate("user_profiles", user.id);
            addSyncEvent({ type: "incoming", table: "user_profiles", detail: "Profile synced from another device" });
            scheduleBatchedSyncToast(toast, t);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient, t, toast]);

  const updateProfile = useCallback(
    async (updates: UserProfileUpdate) => {
      try {
        await mutation.mutateAsync(updates);
        return { error: null, data: null };
      } catch (err) {
        return { error: err };
      }
    },
    [mutation]
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
  }, [queryClient, user?.id]);

  return {
    profile,
    loading,
    saving: mutation.isPending,
    isOfflineData: !navigator.onLine && !!profile,
    updateProfile,
    refetch,
  };
};
