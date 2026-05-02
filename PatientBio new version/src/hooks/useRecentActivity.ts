import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivityItem {
  id: string;
  type: "access" | "upload" | "share" | "prescription" | "notification";
  title: string;
  description: string;
  icon: string;
  timestamp: string;
  link?: string;
  /** i18n key for title, used by components to translate */
  titleKey?: string;
  /** i18n key for description with interpolation params */
  descriptionKey?: string;
  descriptionParams?: Record<string, string>;
}

export const useRecentActivity = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recent-activity", user?.id],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!user?.id) return [];

      const activities: ActivityItem[] = [];

      // Fetch access logs (data accessed)
      const { data: accessLogs } = await supabase
        .from("access_logs")
        .select("id, accessed_at, accessor_name, access_reason")
        .eq("user_id", user.id)
        .order("accessed_at", { ascending: false })
        .limit(5);

      if (accessLogs) {
        accessLogs.forEach((log) => {
          const name = log.accessor_name || "";
          activities.push({
            id: `access-${log.id}`,
            type: "access",
            title: "Data Accessed",
            titleKey: "activityFeed.dataAccessed",
            description: `${name} viewed your data${log.access_reason ? ` - ${log.access_reason}` : ""}`,
            descriptionKey: log.access_reason ? "activityFeed.someoneViewedDataReason" : "activityFeed.someoneViewedData",
            descriptionParams: { name: name || "Someone", reason: log.access_reason || "" },
            icon: "Eye",
            timestamp: log.accessed_at,
            link: "/dashboard/access-analytics",
          });
        });
      }

      // Fetch health records (uploads)
      const { data: records } = await supabase
        .from("health_records")
        .select("id, title, uploaded_at")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })
        .limit(5);

      if (records) {
        records.forEach((record) => {
          activities.push({
            id: `record-${record.id}`,
            type: "upload",
            title: "Record Uploaded",
            titleKey: "activityFeed.recordUploaded",
            description: `You uploaded "${record.title}"`,
            descriptionKey: "activityFeed.youUploaded",
            descriptionParams: { title: record.title },
            icon: "Upload",
            timestamp: record.uploaded_at || new Date().toISOString(),
            link: "/dashboard/prescriptions",
          });
        });
      }

      // Fetch data transactions (data shared)
      const { data: transactions } = await supabase
        .from("data_transactions")
        .select("id, requester_type, created_at, disease_category")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (transactions) {
        transactions.forEach((tx) => {
          activities.push({
            id: `transaction-${tx.id}`,
            type: "share",
            title: "Data Shared",
            titleKey: "activityFeed.dataShared",
            description: `Your ${tx.disease_category || "health"} data was accessed by ${tx.requester_type}`,
            descriptionKey: "activityFeed.dataAccessedBy",
            descriptionParams: { category: tx.disease_category || "health", requester: tx.requester_type },
            icon: "Share2",
            timestamp: tx.created_at,
            link: "/dashboard/share",
          });
        });
      }

      // Fetch notifications
      const { data: notifications } = await supabase
        .from("notifications")
        .select("id, title, message, created_at, type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (notifications) {
        notifications.forEach((notif) => {
          activities.push({
            id: `notif-${notif.id}`,
            type: "notification",
            title: notif.title,
            description: notif.message || "",
            icon: "Bell",
            timestamp: notif.created_at || new Date().toISOString(),
          });
        });
      }

      // Sort by timestamp (newest first) and limit to 5
      return activities
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 5);
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });
};
