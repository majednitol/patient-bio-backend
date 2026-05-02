import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  initOfflineDB,
  cacheHealthData,
  cacheUserProfile,
  cacheHealthRecords,
  cacheAppointments,
  cacheDoctorConnections,
  cacheHealthMetrics,
  cacheWalletData,
  cacheNotifications,
  cacheFamilyMembers,
  cachePrescriptions,
  cacheConsentRecords,
  getCachedHealthData,
  getCachedUserProfile,
  getCachedHealthRecords,
  getCachedAppointments,
  getCachedDoctorConnections,
  getCachedHealthMetrics,
  getCachedWalletData,
  getCachedNotifications,
  getCachedFamilyMembers,
  getCachedPrescriptions,
  getCachedConsentRecords,
  getPendingSyncItems,
  removeFromSyncQueue,
  incrementSyncAttempts,
  updateLastSyncTime,
  getLastSyncTime,
  clearOfflineData,
  pruneStaleCache,
  CachedRecord,
  CachedAppointment,
  CachedDoctorConnection,
  CachedHealthMetric,
  CachedWallet,
  CachedNotification,
  CachedFamilyMember,
  CachedPrescription,
  CachedConsentRecord,
} from "@/lib/offlineDB";
import { supabase } from "@/integrations/supabase/client";
import { getBackoffDelay, shouldRetry, addSyncEvent, onTabSyncMessage } from "@/lib/syncUtils";

interface OfflineStatus {
  isOnline: boolean;
  isOfflineCapable: boolean;
  lastSyncAt: string | null;
  pendingSyncCount: number;
  isSyncing: boolean;
}

export const useOfflineMode = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    isOfflineCapable: false,
    lastSyncAt: null,
    pendingSyncCount: 0,
    isSyncing: false,
  });

  // Initialize offline database
  useEffect(() => {
    const init = async () => {
      try {
        await initOfflineDB();
        const lastSync = await getLastSyncTime();
        const pendingItems = await getPendingSyncItems();
        setStatus((prev) => ({
          ...prev,
          isOfflineCapable: true,
          lastSyncAt: lastSync,
          pendingSyncCount: pendingItems.length,
        }));
      } catch (err) {
        console.error("Failed to initialize offline DB:", err);
      }
    };
    init();
  }, []);

  // Listen for online/offline events with real connectivity verification
  useEffect(() => {
    const verifyConnectivity = async (): Promise<boolean> => {
      if (!navigator.onLine) return false;
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL || ''}/rest/v1/`, {
          method: 'HEAD',
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        return resp.ok || resp.status === 401;
      } catch {
        return false;
      }
    };

    const handleOnline = async () => {
      const reallyOnline = await verifyConnectivity();
      if (!reallyOnline) return;
      setStatus((prev) => ({ ...prev, isOnline: true }));
      toast({
        title: t("pwa.backOnline"),
        description: t("pwa.backOnlineDesc"),
      });
      syncPendingChanges();
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    verifyConnectivity().then((online) => {
      setStatus((prev) => ({ ...prev, isOnline: online }));
    });

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  // Cache current user data for offline access (includes all sections)
  const cacheUserData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch and cache user profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        await cacheUserProfile(user.id, {
          id: profile.id,
          displayName: profile.display_name,
          dateOfBirth: profile.date_of_birth,
          gender: profile.gender,
          location: profile.location,
          phone: profile.phone,
          patientPassportId: profile.patient_passport_id,
          avatarUrl: profile.avatar_url,
          updatedAt: profile.updated_at,
        });
      }

      // Fetch and cache health data
      const { data: healthData } = await supabase
        .from("health_data")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (healthData) {
        await cacheHealthData(user.id, {
          id: healthData.id,
          bloodGroup: healthData.blood_group,
          healthAllergies: healthData.health_allergies,
          currentMedications: healthData.current_medications,
          chronicDiseases: healthData.chronic_diseases,
          emergencyContactName: healthData.emergency_contact_name,
          emergencyContactPhone: healthData.emergency_contact_phone,
          height: healthData.height,
          updatedAt: healthData.updated_at,
        });
      }

      // Cache recent health records (metadata only)
      const { data: records } = await supabase
        .from("health_records")
        .select("id, title, category, disease_category, provider_name, record_date, file_type, uploaded_at")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })
        .limit(50);

      if (records && records.length > 0) {
        await cacheHealthRecords(user.id, records.map(r => ({ ...r, created_at: r.uploaded_at || undefined })));
      }

      // Cache upcoming appointments
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, appointment_date, start_time, end_time, status, reason, doctor_profile:doctor_profiles!appointments_doctor_id_fkey(full_name, specialty)")
        .eq("patient_id", user.id)
        .gte("appointment_date", new Date().toISOString().split("T")[0])
        .order("appointment_date", { ascending: true })
        .limit(20);

      if (appointments && appointments.length > 0) {
        await cacheAppointments(user.id, appointments.map(a => ({
          ...a,
          doctor_profile: Array.isArray(a.doctor_profile) ? a.doctor_profile[0] : a.doctor_profile,
        })));
      }

      // V4: Cache doctor connections
      const { data: doctors } = await supabase
        .from("doctor_connections")
        .select("id, doctor_name, specialty, hospital_clinic, phone, email, notes")
        .eq("user_id", user.id);

      if (doctors && doctors.length > 0) {
        await cacheDoctorConnections(user.id, doctors);
      }

      // V4: Cache health metrics (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: metrics } = await supabase
        .from("health_metrics")
        .select("id, metric_type, value, unit, measured_at, source, notes")
        .eq("user_id", user.id)
        .gte("measured_at", thirtyDaysAgo.toISOString())
        .order("measured_at", { ascending: true })
        .limit(200);

      if (metrics && metrics.length > 0) {
        await cacheHealthMetrics(user.id, metrics);
      }

      // V4: Cache wallet data
      const { data: wallet } = await supabase
        .from("patient_wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (wallet) {
        const { data: transactions } = await supabase
          .from("data_transactions")
          .select("id, requester_type, tokens_earned, disease_category, created_at")
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        await cacheWalletData(user.id, wallet, transactions || []);
      }

      // V4: Cache notifications
      const { data: notifications } = await supabase
        .from("notifications")
        .select("id, type, title, message, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (notifications && notifications.length > 0) {
        await cacheNotifications(user.id, notifications);
      }

      // V4: Cache family members
      const { data: familyMembers } = await supabase
        .from("family_members")
        .select("id, account_holder_id, patient_id, relationship, is_primary, can_manage_records, can_share_data")
        .or(`account_holder_id.eq.${user.id},patient_id.eq.${user.id}`);

      if (familyMembers && familyMembers.length > 0) {
        await cacheFamilyMembers(user.id, familyMembers);
      }

      // V5: Cache prescriptions with doctor info
      const { data: prescriptions } = await supabase
        .from("prescriptions")
        .select("id, diagnosis, medications, is_active, created_at, follow_up_date, doctor_id")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (prescriptions && prescriptions.length > 0) {
        const doctorIds = [...new Set(prescriptions.map(p => p.doctor_id))];
        const { data: doctors } = await supabase
          .from("doctor_profiles")
          .select("user_id, full_name, specialty")
          .in("user_id", doctorIds);

        const doctorMap = new Map(
          (doctors || []).map(d => [d.user_id, d])
        );

        await cachePrescriptions(user.id, prescriptions.map(p => {
          const doc = doctorMap.get(p.doctor_id);
          const meds = Array.isArray(p.medications) ? p.medications as any[] : [];
          return {
            id: p.id,
            diagnosis: p.diagnosis,
            medications: meds,
            doctor_name: doc?.full_name || null,
            doctor_specialty: doc?.specialty || null,
            is_active: p.is_active,
            created_at: p.created_at,
            follow_up_date: p.follow_up_date,
          };
        }));
      }

      // V5: Cache consent records
      const { data: consents } = await supabase
        .from("consent_records")
        .select("id, consent_type, granted_to_type, purpose, scope, is_active, granted_at, expires_at")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });

      if (consents && consents.length > 0) {
        await cacheConsentRecords(user.id, consents.map(c => ({
          ...c,
          is_active: c.is_active ?? true,
        })));
      }

      await updateLastSyncTime();
      const lastSync = await getLastSyncTime();
      setStatus((prev) => ({ ...prev, lastSyncAt: lastSync }));

      // Auto-prune stale cached data (>30 days old)
      await pruneStaleCache().catch(() => {});
    } catch (err) {
      console.error("Failed to cache user data:", err);
    }
  }, [user]);

  // Sync pending changes when back online (with exponential backoff + conflict detection)
  const syncPendingChanges = useCallback(async () => {
    if (!user || !navigator.onLine) return;

    setStatus((prev) => ({ ...prev, isSyncing: true }));

    try {
      const pendingItems = await getPendingSyncItems();
      let synced = 0;

      for (const item of pendingItems) {
        // Skip items that have exceeded max retries
        if (!shouldRetry(item.attempts)) {
          addSyncEvent({ type: "error", table: item.actionType, detail: `Sync item abandoned after ${item.attempts} retries` });
          await removeFromSyncQueue(item.id);
          continue;
        }

        try {
          if (item.actionType === "update_profile") {
            // Conflict detection: check if remote is newer
            const { data: remote } = await supabase
              .from("user_profiles")
              .select("updated_at")
              .eq("user_id", user.id)
              .maybeSingle();

            if (remote?.updated_at && item.createdAt < remote.updated_at) {
              // Remote is newer — create sync conflict
              await supabase.from("sync_conflicts").insert([{
                user_id: user.id,
                resource_type: "user_profile",
                local_data: item.payload as unknown as Record<string, string>,
                remote_data: remote as unknown as Record<string, string>,
                source_system: "offline_sync",
                conflict_fields: Object.keys(item.payload),
              }]);
              addSyncEvent({ type: "conflict", table: "user_profiles", detail: "Conflict detected — remote data is newer" });
              await removeFromSyncQueue(item.id);
              continue;
            }

            await supabase.from("user_profiles").update(item.payload).eq("user_id", user.id);
          } else if (item.actionType === "update_health_data") {
            const { data: remote } = await supabase
              .from("health_data")
              .select("updated_at")
              .eq("user_id", user.id)
              .maybeSingle();

            if (remote?.updated_at && item.createdAt < remote.updated_at) {
              await supabase.from("sync_conflicts").insert([{
                user_id: user.id,
                resource_type: "health_data",
                local_data: item.payload as unknown as Record<string, string>,
                remote_data: remote as unknown as Record<string, string>,
                source_system: "offline_sync",
                conflict_fields: Object.keys(item.payload),
              }]);
              addSyncEvent({ type: "conflict", table: "health_data", detail: "Conflict detected — remote data is newer" });
              await removeFromSyncQueue(item.id);
              continue;
            }

            await supabase.from("health_data").upsert({ user_id: user.id, ...item.payload });
          } else if (item.actionType === "submit_intake") {
            await supabase.from("appointment_intake").upsert(item.payload as any, { onConflict: "appointment_id" });
          } else if (item.actionType === "add_health_metric") {
            await supabase.from("health_metrics").insert([{
              user_id: user.id,
              metric_type: item.payload.metric_type as string,
              value: item.payload.value as number,
              unit: item.payload.unit as string,
              measured_at: (item.payload.measured_at as string) || new Date().toISOString(),
              source: (item.payload.source as string) || "manual",
              notes: (item.payload.notes as string) || null,
            }]);
          }
          await removeFromSyncQueue(item.id);
          synced++;
          addSyncEvent({ type: "outgoing", table: item.actionType, detail: `Synced offline ${item.actionType}` });
        } catch (err) {
          console.error("Failed to sync item:", item.id, err);
          await incrementSyncAttempts(item.id);
          addSyncEvent({ type: "retry", table: item.actionType, detail: `Retry ${item.attempts + 1} scheduled` });

          // Wait with exponential backoff before next item
          const delay = getBackoffDelay(item.attempts);
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      // Re-cache after sync
      await cacheUserData();

      await updateLastSyncTime();
      const updatedPending = await getPendingSyncItems();
      const lastSync = await getLastSyncTime();

      setStatus((prev) => ({
        ...prev,
        lastSyncAt: lastSync,
        pendingSyncCount: updatedPending.length,
        isSyncing: false,
      }));

      if (synced > 0) {
        toast({
          title: t("pwa.syncComplete"),
          description: t("pwa.syncCompleteDesc", { count: synced }),
        });
      }
    } catch (err) {
      console.error("Sync failed:", err);
      setStatus((prev) => ({ ...prev, isSyncing: false }));
    }

  }, [user, toast, cacheUserData]);

  // Get offline data if online fetch fails
  const getOfflineHealthData = useCallback(async () => {
    if (!user) return null;
    return getCachedHealthData(user.id);
  }, [user]);

  const getOfflineProfile = useCallback(async () => {
    if (!user) return null;
    return getCachedUserProfile(user.id);
  }, [user]);

  const getOfflineRecords = useCallback(async (): Promise<CachedRecord[]> => {
    if (!user) return [];
    return getCachedHealthRecords(user.id);
  }, [user]);

  const getOfflineAppointments = useCallback(async (): Promise<CachedAppointment[]> => {
    if (!user) return [];
    return getCachedAppointments(user.id);
  }, [user]);

  const getOfflineDoctorConnections = useCallback(async (): Promise<CachedDoctorConnection[]> => {
    if (!user) return [];
    return getCachedDoctorConnections(user.id);
  }, [user]);

  const getOfflineHealthMetrics = useCallback(async (): Promise<CachedHealthMetric[]> => {
    if (!user) return [];
    return getCachedHealthMetrics(user.id);
  }, [user]);

  const getOfflineWallet = useCallback(async (): Promise<CachedWallet | undefined> => {
    if (!user) return undefined;
    return getCachedWalletData(user.id);
  }, [user]);

  const getOfflineNotifications = useCallback(async (): Promise<CachedNotification[]> => {
    if (!user) return [];
    return getCachedNotifications(user.id);
  }, [user]);

  const getOfflineFamilyMembers = useCallback(async (): Promise<CachedFamilyMember[]> => {
    if (!user) return [];
    return getCachedFamilyMembers(user.id);
  }, [user]);

  const getOfflinePrescriptions = useCallback(async (): Promise<CachedPrescription[]> => {
    if (!user) return [];
    return getCachedPrescriptions(user.id);
  }, [user]);

  const getOfflineConsentRecords = useCallback(async (): Promise<CachedConsentRecord[]> => {
    if (!user) return [];
    return getCachedConsentRecords(user.id);
  }, [user]);

  // Clear all offline data (e.g., on logout)
  const clearCache = useCallback(async () => {
    await clearOfflineData();
    setStatus((prev) => ({
      ...prev,
      lastSyncAt: null,
      pendingSyncCount: 0,
    }));
  }, []);

  // Auto-cache when user is authenticated and online + register periodic sync
  useEffect(() => {
    if (user && navigator.onLine) {
      cacheUserData();

      if ("serviceWorker" in navigator && "periodicSync" in (navigator as any)) {
        navigator.serviceWorker.ready.then((registration: any) => {
          registration.periodicSync?.register("refresh-health-data", {
            minInterval: 12 * 60 * 60 * 1000,
          }).catch(() => {});
        });
      }

      const handleSWMessage = (event: MessageEvent) => {
        if (event.data?.type === "PERIODIC_SYNC_REFRESH") {
          cacheUserData();
        }
      };
      navigator.serviceWorker?.addEventListener("message", handleSWMessage);
      return () => {
        navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
      };
    }
  }, [user, cacheUserData]);

  // BroadcastChannel listener for same-device tab sync
  useEffect(() => {
    if (!user?.id) return;
    const unsub = onTabSyncMessage((msg) => {
      if (msg.userId !== user.id) return;
      // Invalidate relevant queries when another tab updates
      if (msg.table === "user_profiles") {
        queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
      } else if (msg.table === "health_data") {
        queryClient.invalidateQueries({ queryKey: ["health-data", user.id] });
      } else if (msg.table === "health_metrics") {
        queryClient.invalidateQueries({ queryKey: ["health-metrics"] });
      }
      addSyncEvent({ type: "incoming", table: msg.table, detail: "Synced from another tab" });
    });
    return unsub;
  }, [user?.id, queryClient]);

  return {
    ...status,
    cacheUserData,
    syncPendingChanges,
    getOfflineHealthData,
    getOfflineProfile,
    getOfflineRecords,
    getOfflineAppointments,
    getOfflineDoctorConnections,
    getOfflineHealthMetrics,
    getOfflineWallet,
    getOfflineNotifications,
    getOfflineFamilyMembers,
    getOfflinePrescriptions,
    getOfflineConsentRecords,
    clearCache,
  };
};
