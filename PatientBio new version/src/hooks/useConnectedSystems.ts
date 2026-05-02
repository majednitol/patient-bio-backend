import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ConnectedSystem {
  id: string;
  type: "smart_session" | "fhir_subscription" | "bulk_export";
  name: string;
  status: "active" | "expired" | "error" | "completed" | "paused";
  lastSyncAt: string | null;
  createdAt: string;
  details: Record<string, any>;
}

export interface DataExchangeEvent {
  id: string;
  type: "import" | "export" | "webhook";
  description: string;
  status: "success" | "failed" | "pending" | "in_progress";
  timestamp: string;
  details: Record<string, any>;
}

function getSmartSessionStatus(session: any): ConnectedSystem["status"] {
  if (session.status === "error") return "error";
  if (session.status === "completed" || session.status === "authorized") {
    if (session.token_expires_at && new Date(session.token_expires_at) < new Date()) return "expired";
    if (new Date(session.expires_at) < new Date()) return "expired";
    return "active";
  }
  return "expired";
}

function getExportStatus(job: any): DataExchangeEvent["status"] {
  if (job.status === "completed") return "success";
  if (job.status === "failed") return "failed";
  if (job.status === "processing") return "in_progress";
  return "pending";
}

export function useConnectedSystems() {
  const { user } = useAuth();

  const { data: systems = [], isLoading: systemsLoading } = useQuery({
    queryKey: ["connected-systems", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const [smartRes, subsRes] = await Promise.all([
        supabase
          .from("smart_launch_sessions")
          .select("id, status, ehr_url, patient_context, fhir_user, created_at, expires_at, token_expires_at, updated_at, scope")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("fhir_subscriptions")
          .select("id, subscriber_name, endpoint_url, topic, status, last_triggered_at, created_at, last_error")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const result: ConnectedSystem[] = [];

      (smartRes.data || []).forEach((s) => {
        result.push({
          id: s.id,
          type: "smart_session",
          name: new URL(s.ehr_url).hostname || s.ehr_url,
          status: getSmartSessionStatus(s),
          lastSyncAt: s.updated_at || s.created_at,
          createdAt: s.created_at,
          details: {
            ehrUrl: s.ehr_url,
            patientContext: s.patient_context,
            fhirUser: s.fhir_user,
            scope: s.scope,
          },
        });
      });

      (subsRes.data || []).forEach((s) => {
        result.push({
          id: s.id,
          type: "fhir_subscription",
          name: s.subscriber_name || s.endpoint_url,
          status: s.status === "active" ? "active" : s.last_error ? "error" : "paused",
          lastSyncAt: s.last_triggered_at,
          createdAt: s.created_at,
          details: {
            endpointUrl: s.endpoint_url,
            topic: s.topic,
            lastError: s.last_error,
          },
        });
      });

      return result;
    },
    enabled: !!user?.id,
  });

  const { data: exchangeLog = [], isLoading: logLoading } = useQuery({
    queryKey: ["data-exchange-log", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const [exportsRes, notificationsRes] = await Promise.all([
        supabase
          .from("bulk_export_jobs")
          .select("id, export_type, status, resource_types, created_at, completed_at, total_resources, processed_resources, error_message")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("fhir_subscription_notifications")
          .select("id, status, event_type, resource_type, sent_at, response_status, response_body, subscription_id")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      const events: DataExchangeEvent[] = [];

      (exportsRes.data || []).forEach((e: any) => {
        events.push({
          id: e.id,
          type: "export",
          description: `${e.export_type.toUpperCase()} export — ${(e.resource_types || []).join(", ") || "all resources"}`,
          status: getExportStatus(e),
          timestamp: e.completed_at || e.created_at,
          details: {
            totalResources: e.total_resources,
            processedResources: e.processed_resources,
            errorMessage: e.error_message,
          },
        });
      });

      (notificationsRes.data || []).forEach((n: any) => {
        events.push({
          id: n.id,
          type: "webhook",
          description: `Webhook: ${n.event_type} ${n.resource_type}`,
          status: n.status === "sent" ? "success" : "failed",
          timestamp: n.sent_at || n.created_at,
          details: {
            responseCode: n.response_status,
            errorMessage: n.response_body,
          },
        });
      });

      // Sort by timestamp descending
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return events;
    },
    enabled: !!user?.id,
  });

  const activeSystems = systems.filter((s) => s.status === "active");
  const errorSystems = systems.filter((s) => s.status === "error");

  return {
    systems,
    exchangeLog,
    activeSystems,
    errorSystems,
    isLoading: systemsLoading || logLoading,
  };
}
