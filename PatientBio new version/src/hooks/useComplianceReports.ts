import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type ReportType = 
  | "hipaa_audit" 
  | "gdpr_dsar" 
  | "access_report" 
  | "consent_report" 
  | "security_incident"
  | "cross_border";

export interface ComplianceReport {
  id: string;
  report_type: ReportType;
  generated_by: string;
  report_period_start: string;
  report_period_end: string;
  report_data: Record<string, unknown>;
  file_url: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  created_at: string;
}

interface GenerateReportParams {
  report_type: ReportType;
  start_date: string;
  end_date: string;
}

export const useComplianceReports = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ["compliance-reports"],
    queryFn: async (): Promise<ComplianceReport[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("compliance_reports")
        .select("id, report_type, generated_by, report_period_start, report_period_end, report_data, file_url, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ComplianceReport[];
    },
    enabled: !!user?.id,
  });

  const generateReport = useMutation({
    mutationFn: async ({ report_type, start_date, end_date }: GenerateReportParams) => {
      if (!user?.id) throw new Error("Not authenticated");

      let reportData: Record<string, unknown> = {};

      if (report_type === "hipaa_audit") {
        const [accessLogs, auditTrail, consentRecords] = await Promise.all([
          supabase.from("access_logs").select("id, accessor_type, accessor_email, country, city, accessed_at, user_id").gte("accessed_at", start_date).lte("accessed_at", end_date).limit(1000),
          supabase.rpc("verify_audit_trail_integrity", { p_start_date: start_date, p_end_date: end_date }),
          supabase.from("consent_records").select("id, consent_type, granted_to_type, is_active, created_at").gte("created_at", start_date).lte("created_at", end_date).limit(1000),
        ]);
        reportData = {
          access_logs_count: accessLogs.data?.length || 0,
          access_logs_summary: groupByAccessorType(accessLogs.data || []),
          audit_integrity: auditTrail.data?.[0] || { integrity_percentage: 100 },
          consent_records_count: consentRecords.data?.length || 0,
          consent_summary: groupByConsentType(consentRecords.data || []),
        };
      } else if (report_type === "access_report") {
        const [accessLogs, dataRequests] = await Promise.all([
          supabase.from("access_logs").select("id, accessor_type, accessor_email, country, city, accessed_at, user_id").gte("accessed_at", start_date).lte("accessed_at", end_date).limit(1000),
          supabase.from("data_access_requests").select("id, status, requester_type, disease_category, created_at").gte("created_at", start_date).lte("created_at", end_date).limit(1000),
        ]);
        reportData = {
          total_access_events: accessLogs.data?.length || 0,
          access_by_type: groupByAccessorType(accessLogs.data || []),
          access_by_location: groupByLocation(accessLogs.data || []),
          data_requests: {
            total: dataRequests.data?.length || 0,
            approved: dataRequests.data?.filter(r => r.status === "approved").length || 0,
            rejected: dataRequests.data?.filter(r => r.status === "rejected").length || 0,
            pending: dataRequests.data?.filter(r => r.status === "pending").length || 0,
          },
        };
      } else if (report_type === "consent_report") {
        const { data: consents } = await supabase
          .from("consent_records").select("id, consent_type, granted_to_type, is_active, created_at").gte("created_at", start_date).lte("created_at", end_date).limit(1000);
        reportData = {
          total_consents: consents?.length || 0,
          active_consents: consents?.filter(c => c.is_active).length || 0,
          revoked_consents: consents?.filter(c => !c.is_active).length || 0,
          by_type: groupByConsentType(consents || []),
          by_granted_to_type: groupByGrantedToType(consents || []),
        };
      } else if (report_type === "gdpr_dsar") {
        const [profile, healthData, healthRecords, accessLogs] = await Promise.all([
          supabase.from("user_profiles").select("user_id, display_name").limit(100),
          supabase.from("health_data").select("id, user_id").limit(100),
          supabase.from("health_records").select("id, title, category, disease_category, uploaded_at").limit(100),
          supabase.from("access_logs").select("id, accessor_type, country, accessed_at").gte("accessed_at", start_date).lte("accessed_at", end_date).limit(1000),
        ]);
        reportData = {
          profiles_count: profile.data?.length || 0,
          health_data_entries: healthData.data?.length || 0,
          health_records_count: healthRecords.data?.length || 0,
          access_events_in_period: accessLogs.data?.length || 0,
          data_categories: ["profiles", "health_data", "health_records", "access_logs", "consent_records"],
        };
      } else if (report_type === "security_incident") {
        const [integrity, accessLogs] = await Promise.all([
          supabase.rpc("verify_audit_trail_integrity", { p_start_date: start_date, p_end_date: end_date }),
          supabase.from("access_logs").select("id, accessor_type, country, accessed_at").gte("accessed_at", start_date).lte("accessed_at", end_date).limit(1000),
        ]);
        reportData = {
          integrity_score: integrity.data?.[0]?.integrity_percentage ?? 100,
          broken_chains: integrity.data?.[0]?.broken_chain_count ?? 0,
          total_entries: integrity.data?.[0]?.total_entries ?? 0,
          verified_entries: integrity.data?.[0]?.verified_entries ?? 0,
          total_access_events: accessLogs.data?.length || 0,
          access_by_type: groupByAccessorType(accessLogs.data || []),
          access_by_location: groupByLocation(accessLogs.data || []),
          anomalous_patterns: detectAnomalies(accessLogs.data || []),
        };
      } else if (report_type === "cross_border") {
        const [transfers, consents] = await Promise.all([
          supabase.from("data_transfer_agreements").select("id, source_jurisdiction, destination_jurisdiction, transfer_basis, revoked_at, created_at").gte("created_at", start_date).lte("created_at", end_date).limit(1000),
          supabase.from("consent_records").select("id, consent_type, is_active").eq("consent_type", "cross_border").limit(1000),
        ]);
        const transferData = transfers.data || [];
        const activeTransfers = transferData.filter(t => !t.revoked_at);
        reportData = {
          total_transfers: transferData.length,
          active_transfers: activeTransfers.length,
          revoked_transfers: transferData.length - activeTransfers.length,
          by_jurisdiction: groupByJurisdiction(transferData),
          by_transfer_basis: groupByTransferBasis(transferData),
          consent_records_count: consents.data?.length || 0,
          consent_coverage: transferData.length > 0
            ? Math.round((activeTransfers.length / transferData.length) * 100)
            : 100,
        };
      }

      const { data, error } = await supabase
        .from("compliance_reports")
        .insert([{
          report_type: report_type as string,
          generated_by: user.id,
          report_period_start: start_date,
          report_period_end: end_date,
          report_data: reportData as unknown as Record<string, never>,
          status: "completed" as const,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-reports"] });
      toast({ title: "Report Generated", description: "Your compliance report has been generated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const verifyAuditIntegrity = useMutation({
    mutationFn: async ({ start_date, end_date }: { start_date?: string; end_date?: string }) => {
      const { data, error } = await supabase.rpc("verify_audit_trail_integrity", {
        p_start_date: start_date || null,
        p_end_date: end_date || null,
      });
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  return {
    reports: reports || [],
    isLoading,
    error,
    generateReport: generateReport.mutateAsync,
    isGenerating: generateReport.isPending,
    verifyAuditIntegrity: verifyAuditIntegrity.mutateAsync,
    isVerifying: verifyAuditIntegrity.isPending,
  };
};

// Helper functions
function groupByAccessorType(logs: Array<{ accessor_type?: string }>) {
  const groups: Record<string, number> = {};
  logs.forEach(log => {
    const type = log.accessor_type || "unknown";
    groups[type] = (groups[type] || 0) + 1;
  });
  return groups;
}

function groupByLocation(logs: Array<{ country?: string }>) {
  const groups: Record<string, number> = {};
  logs.forEach(log => {
    const location = log.country || "Unknown";
    groups[location] = (groups[location] || 0) + 1;
  });
  return groups;
}

function groupByConsentType(consents: Array<{ consent_type?: string }>) {
  const groups: Record<string, number> = {};
  consents.forEach(c => {
    const type = c.consent_type || "unknown";
    groups[type] = (groups[type] || 0) + 1;
  });
  return groups;
}

function groupByGrantedToType(consents: Array<{ granted_to_type?: string | null }>) {
  const groups: Record<string, number> = {};
  consents.forEach(c => {
    const type = c.granted_to_type || "general";
    groups[type] = (groups[type] || 0) + 1;
  });
  return groups;
}

function groupByJurisdiction(transfers: Array<{ source_jurisdiction?: string; destination_jurisdiction?: string }>) {
  const groups: Record<string, number> = {};
  transfers.forEach(t => {
    const key = `${t.source_jurisdiction || "?"} -> ${t.destination_jurisdiction || "?"}`;
    groups[key] = (groups[key] || 0) + 1;
  });
  return groups;
}

function groupByTransferBasis(transfers: Array<{ transfer_basis?: string }>) {
  const groups: Record<string, number> = {};
  transfers.forEach(t => {
    const basis = t.transfer_basis || "unknown";
    groups[basis] = (groups[basis] || 0) + 1;
  });
  return groups;
}

function detectAnomalies(logs: Array<{ accessor_type?: string; country?: string; accessed_at?: string }>) {
  const patterns: Array<{ type: string; description: string; severity: string }> = [];

  // Detect high-frequency access from single location
  const locationCounts = groupByLocation(logs as Array<{ country?: string }>);
  const totalLogs = logs.length;
  for (const [loc, count] of Object.entries(locationCounts)) {
    if (totalLogs > 10 && count / totalLogs > 0.8 && loc !== "Unknown") {
      patterns.push({
        type: "geo_concentration",
        description: `${Math.round((count / totalLogs) * 100)}% of access from ${loc}`,
        severity: "low",
      });
    }
  }

  // Detect unusual hours (outside 6am-10pm)
  let offHoursCount = 0;
  logs.forEach(log => {
    if (log.accessed_at) {
      const hour = new Date(log.accessed_at).getHours();
      if (hour < 6 || hour > 22) offHoursCount++;
    }
  });
  if (totalLogs > 10 && offHoursCount / totalLogs > 0.3) {
    patterns.push({
      type: "off_hours_access",
      description: `${offHoursCount} access events outside business hours (${Math.round((offHoursCount / totalLogs) * 100)}%)`,
      severity: "medium",
    });
  }

  if (patterns.length === 0) {
    patterns.push({ type: "none", description: "No anomalous patterns detected", severity: "info" });
  }

  return patterns;
}
