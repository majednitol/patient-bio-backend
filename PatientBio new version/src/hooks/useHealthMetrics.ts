import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getCachedHealthMetrics, addToSyncQueue, cacheHealthMetrics as cacheMetricsToIDB } from "@/lib/offlineDB";
import { useTranslation } from "react-i18next";
import { broadcastCacheUpdate, addSyncEvent } from "@/lib/syncUtils";

export interface HealthMetric {
  id: string;
  user_id: string;
  metric_type: string;
  value: number;
  unit: string;
  measured_at: string;
  source: string;
  notes: string | null;
  created_at: string;
}

export interface AddMetricData {
  metric_type: string;
  value: number;
  unit: string;
  measured_at?: string;
  source?: string;
  notes?: string;
}

export const METRIC_TYPES = [
  { type: "weight", label: "Weight", unit: "kg", icon: "⚖️" },
  { type: "blood_pressure_systolic", label: "Blood Pressure (Systolic)", unit: "mmHg", icon: "❤️" },
  { type: "blood_pressure_diastolic", label: "Blood Pressure (Diastolic)", unit: "mmHg", icon: "❤️" },
  { type: "heart_rate", label: "Heart Rate", unit: "bpm", icon: "💓" },
  { type: "blood_sugar", label: "Blood Sugar", unit: "mg/dL", icon: "🩸" },
  { type: "temperature", label: "Temperature", unit: "°C", icon: "🌡️" },
  { type: "oxygen_saturation", label: "Oxygen Saturation", unit: "%", icon: "🫁" },
  { type: "sleep_hours", label: "Sleep", unit: "hours", icon: "😴" },
  { type: "steps", label: "Steps", unit: "steps", icon: "🚶" },
  { type: "water_intake", label: "Water Intake", unit: "ml", icon: "💧" },
];

export const useHealthMetrics = (metricType?: string, days: number = 30) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const lastMutationAt = useRef<number>(0);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["health-metrics", user?.id, metricType, days],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        let query = supabase
          .from("health_metrics")
          .select("id, user_id, metric_type, value, unit, measured_at, source, notes, created_at")
          .eq("user_id", user.id)
          .gte("measured_at", startDate.toISOString())
          .order("measured_at", { ascending: true });

        if (metricType) {
          query = query.eq("metric_type", metricType);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data as HealthMetric[];
      } catch (err) {
        if (!navigator.onLine) {
          const cached = await getCachedHealthMetrics(user.id);
          let filtered = cached.filter(m => m.measuredAt >= startDate.toISOString());
          if (metricType) {
            filtered = filtered.filter(m => m.metricType === metricType);
          }
          return filtered.map(m => ({
            id: m.id,
            user_id: m.userId,
            metric_type: m.metricType,
            value: m.value,
            unit: m.unit,
            measured_at: m.measuredAt,
            source: m.source,
            notes: m.notes,
            created_at: m.cachedAt,
          })) as HealthMetric[];
        }
        throw err;
      }
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  // Derive latest metric per type from already-fetched data
  const latestMetrics = useMemo(() => {
    const latest: Record<string, HealthMetric> = {};
    if (!metrics) return latest;
    for (const metric of metrics) {
      const existing = latest[metric.metric_type];
      if (!existing || new Date(metric.measured_at) > new Date(existing.measured_at)) {
        latest[metric.metric_type] = metric;
      }
    }
    return latest;
  }, [metrics]);

  // Add metric mutation
  const addMutation = useMutation({
    mutationFn: async (data: AddMetricData) => {
      if (!user?.id) throw new Error("Not authenticated");

      if (!navigator.onLine) {
        const payload = {
          metric_type: data.metric_type,
          value: data.value,
          unit: data.unit,
          measured_at: data.measured_at || new Date().toISOString(),
          source: data.source || "manual",
          notes: data.notes || null,
        };
        await addToSyncQueue("add_health_metric", payload);
        return { id: crypto.randomUUID(), user_id: user.id, ...payload, created_at: new Date().toISOString() };
      }

      lastMutationAt.current = Date.now();

      const { data: result, error } = await supabase
        .from("health_metrics")
        .insert({
          user_id: user.id,
          metric_type: data.metric_type,
          value: data.value,
          unit: data.unit,
          measured_at: data.measured_at || new Date().toISOString(),
          source: data.source || "manual",
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-metrics"] });
      broadcastCacheUpdate("health_metrics", user?.id || "");
      addSyncEvent({ type: "outgoing", table: "health_metrics", detail: "Metric recorded" });
      if (!navigator.onLine) {
        toast.success(t("pwa.metricSavedOffline"));
      } else {
        toast.success("Metric recorded successfully!");
      }
    },
    onError: (error: Error) => {
      console.error("Add metric error:", error);
      toast.error("Failed to record metric");
    },
  });

  // Delete metric mutation
  const deleteMutation = useMutation({
    mutationFn: async (metricId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      lastMutationAt.current = Date.now();
      const { error } = await supabase
        .from("health_metrics")
        .delete()
        .eq("id", metricId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-metrics"] });
      toast.success("Metric deleted");
    },
    onError: (error: Error) => {
      console.error("Delete metric error:", error);
      toast.error("Failed to delete metric");
    },
  });

  // Realtime subscription for cross-device sync
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`metrics-sync-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "health_metrics",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (Date.now() - lastMutationAt.current < 2000) return;
          addSyncEvent({ type: "incoming", table: "health_metrics", detail: "Metrics synced from another device" });
          queryClient.invalidateQueries({ queryKey: ["health-metrics"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Calculate trend for a metric type
  const calculateTrend = (type: string): { direction: "up" | "down" | "stable"; percentage: number } | null => {
    if (!metrics || metrics.length < 2) return null;
    const typeMetrics = metrics.filter((m) => m.metric_type === type);
    if (typeMetrics.length < 2) return null;
    const recent = typeMetrics.slice(-5);
    const older = typeMetrics.slice(0, Math.min(5, typeMetrics.length - 5));
    if (older.length === 0) return null;
    const recentAvg = recent.reduce((sum, m) => sum + Number(m.value), 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + Number(m.value), 0) / older.length;
    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;
    if (Math.abs(percentChange) < 2) {
      return { direction: "stable", percentage: 0 };
    }
    return {
      direction: percentChange > 0 ? "up" : "down",
      percentage: Math.abs(percentChange),
    };
  };

  return {
    metrics: metrics || [],
    latestMetrics,
    isLoading,
    addMetric: addMutation.mutate,
    isAdding: addMutation.isPending,
    deleteMetric: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    calculateTrend,
  };
};
