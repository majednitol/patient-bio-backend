import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserProfileStats(userId: string | null) {
  return useQuery({
    queryKey: ["user-profile-stats", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [healthRecords, accessTokens, auditEvents, appointments] = await Promise.all([
        supabase.from("health_records").select("id", { count: "exact", head: true }).eq("user_id", userId!),
        supabase.from("access_tokens").select("id", { count: "exact", head: true }).eq("user_id", userId!),
        supabase.from("audit_trail").select("id", { count: "exact", head: true }).eq("user_id", userId!),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("patient_id", userId!),
      ]);

      return {
        healthRecords: healthRecords.count ?? 0,
        accessTokens: accessTokens.count ?? 0,
        auditEvents: auditEvents.count ?? 0,
        appointments: appointments.count ?? 0,
      };
    },
  });
}

export function useUserRecentActivity(userId: string | null) {
  return useQuery({
    queryKey: ["user-recent-activity", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_trail")
        .select("id, event_type, action, entity_type, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });
}

export function useUserAccessHistory(userId: string | null) {
  return useQuery({
    queryKey: ["user-access-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_logs")
        .select("id, accessor_type, accessor_email, access_reason, accessed_at, city, country")
        .eq("user_id", userId!)
        .order("accessed_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });
}

export function useUserRoleHistory(userId: string | null) {
  return useQuery({
    queryKey: ["user-role-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("id, action, details, created_at")
        .eq("target_id", userId!)
        .eq("target_type", "user")
        .in("action", ["role_change", "set_role", "update_role"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });
}
