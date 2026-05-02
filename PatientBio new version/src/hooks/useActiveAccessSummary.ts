import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActiveAccessEntry {
  id: string;
  type: "consent" | "doctor_access" | "token";
  providerName: string;
  providerType: string;
  grantedAt: string;
  expiresAt: string | null;
  scope: string[];
  sourceId: string; // consent_id, access_id, or token_id for revocation
}

export interface RecentAccessEvent {
  id: string;
  accessorName: string | null;
  accessorType: string;
  accessedAt: string;
  reason: string | null;
}

/**
 * Aggregates active consents, doctor access records, and recent access logs
 * into a single unified view of "who has access to my data right now."
 */
export function useActiveAccessSummary() {
  const { user } = useAuth();

  const activeAccess = useQuery({
    queryKey: ["active-access-summary", user?.id],
    enabled: !!user?.id,
    staleTime: STALE_TIMES.SHORT,
    queryFn: async () => {
      const entries: ActiveAccessEntry[] = [];

      // 1. Active consents
      const { data: consents } = await supabase
        .from("consent_records")
        .select("*")
        .eq("patient_id", user!.id)
        .eq("is_active", true);

      (consents || []).forEach((c) => {
        entries.push({
          id: `consent-${c.id}`,
          type: "consent",
          providerName: c.granted_to_type || "General",
          providerType: c.granted_to_type || "system",
          grantedAt: c.granted_at || c.created_at || "",
          expiresAt: c.expires_at,
          scope: Array.isArray(c.scope) ? (c.scope as string[]) : [],
          sourceId: c.id,
        });
      });

      // 2. Active doctor access
      const { data: doctorAccess } = await supabase
        .from("doctor_patient_access")
        .select("id, doctor_id, granted_at, last_accessed_at")
        .eq("patient_id", user!.id)
        .eq("is_active", true);

      if (doctorAccess && doctorAccess.length > 0) {
        const doctorIds = doctorAccess.map((d) => d.doctor_id);
        const { data: profiles } = await supabase
          .from("doctor_profiles")
          .select("user_id, full_name, specialty")
          .in("user_id", doctorIds);

        const profileMap = new Map(
          (profiles || []).map((p) => [p.user_id, p])
        );

        doctorAccess.forEach((da) => {
          const profile = profileMap.get(da.doctor_id);
          entries.push({
            id: `doctor-${da.id}`,
            type: "doctor_access",
            providerName: profile ? `Dr. ${profile.full_name}` : "Unknown Doctor",
            providerType: "doctor",
            grantedAt: da.granted_at || "",
            expiresAt: null,
            scope: ["health_records", "health_data", "prescriptions"],
            sourceId: da.id,
          });
        });
      }

      // 3. Active (non-revoked, non-expired) access tokens
      const { data: tokens } = await supabase
        .from("access_tokens")
        .select("id, label, created_at, expires_at, shared_scopes, is_revoked")
        .eq("user_id", user!.id)
        .eq("is_revoked", false)
        .gt("expires_at", new Date().toISOString());

      (tokens || []).forEach((t) => {
        const scopes = Array.isArray(t.shared_scopes) ? (t.shared_scopes as string[]) : [];
        entries.push({
          id: `token-${t.id}`,
          type: "token",
          providerName: t.label || "Shared Link",
          providerType: "token",
          grantedAt: t.created_at,
          expiresAt: t.expires_at,
          scope: scopes,
          sourceId: t.id,
        });
      });

      return entries;
    },
  });

  const recentActivity = useQuery({
    queryKey: ["recent-access-activity", user?.id],
    enabled: !!user?.id,
    staleTime: STALE_TIMES.FREQUENT,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_logs")
        .select("id, accessor_name, accessor_type, accessed_at, access_reason")
        .eq("user_id", user!.id)
        .order("accessed_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map((log) => ({
        id: log.id,
        accessorName: log.accessor_name,
        accessorType: log.accessor_type,
        accessedAt: log.accessed_at,
        reason: log.access_reason,
      })) as RecentAccessEvent[];
    },
  });

  return {
    activeEntries: activeAccess.data || [],
    activeCount: activeAccess.data?.length || 0,
    isLoadingAccess: activeAccess.isLoading,
    recentActivity: recentActivity.data || [],
    isLoadingActivity: recentActivity.isLoading,
  };
}
