import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { ProvenanceRecord, RecordProvenanceParams } from "@/lib/provenanceTracker";
import { recordProvenance } from "@/lib/provenanceTracker";

/**
 * Hook for fetching provenance history for a specific resource
 */
export function useResourceProvenance(resourceType: string, resourceId: string | null) {
  return useQuery({
    queryKey: ["provenance", resourceType, resourceId],
    queryFn: async () => {
      if (!resourceId) return [];
      
      const { data, error } = await supabase
        .from("data_provenance")
        .select("id, user_id, target_resource_type, target_resource_id, activity_type, agent_type, agent_id, agent_name, source_system, source_document, source_version, policy_reference, signature, metadata, recorded_at, created_at")
        .eq("target_resource_type", resourceType)
        .eq("target_resource_id", resourceId)
        .order("recorded_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ProvenanceRecord[];
    },
    enabled: !!resourceId,
  });
}

/**
 * Hook for fetching all provenance records for the current user
 */
export function useUserProvenance(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["provenance", "user", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_provenance")
        .select("id, user_id, target_resource_type, target_resource_id, activity_type, agent_type, agent_id, agent_name, source_system, source_document, source_version, policy_reference, signature, metadata, recorded_at, created_at")
        .order("recorded_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ProvenanceRecord[];
    },
    enabled: !!user,
  });
}

/**
 * Hook for fetching provenance grouped by activity type
 */
export function useProvenanceByActivity() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["provenance", "by-activity", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_provenance")
        .select("activity_type")
        .order("recorded_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Group by activity type
      const grouped = (data || []).reduce((acc, record) => {
        const activity = record.activity_type;
        acc[activity] = (acc[activity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return grouped;
    },
    enabled: !!user,
  });
}

/**
 * Hook for fetching provenance grouped by source system
 */
export function useProvenanceBySource() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["provenance", "by-source", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_provenance")
        .select("source_system")
        .order("recorded_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Group by source system
      const grouped = (data || []).reduce((acc, record) => {
        const source = record.source_system || "unknown";
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return grouped;
    },
    enabled: !!user,
  });
}

/**
 * Hook for recording new provenance
 */
export function useRecordProvenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecordProvenanceParams) => {
      const id = await recordProvenance(params);
      if (!id) throw new Error("Failed to record provenance");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provenance"] });
    },
    onError: (error) => {
      console.error("Provenance recording error:", error);
      toast({ title: "Failed to record data provenance", variant: "destructive" });
    },
  });
}

/**
 * Hook for fetching provenance statistics
 */
export function useProvenanceStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["provenance", "stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_provenance")
        .select("activity_type, source_system, recorded_at")
        .limit(1000);

      if (error) throw error;

      const records = data || [];
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const recentRecords = records.filter(
        (r) => new Date(r.recorded_at) >= thirtyDaysAgo
      );

      return {
        totalRecords: records.length,
        last30Days: recentRecords.length,
        byActivity: records.reduce((acc, r) => {
          acc[r.activity_type] = (acc[r.activity_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        bySource: records.reduce((acc, r) => {
          const source = r.source_system || "unknown";
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
    },
    enabled: !!user,
  });
}
