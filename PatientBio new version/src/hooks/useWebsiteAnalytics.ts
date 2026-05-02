import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";

export interface DailyTrendEntry {
  date: string;
  visitors: number;
  pageviews: number;
  pageviewsPerVisit: number;
  sessionDuration: number;
  bounceRate: number;
}

export interface WebsiteAnalytics {
  period: { start: string; end: string; days: number };
  summary: {
    totalVisitors: number;
    totalPageviews: number;
    avgPagesPerVisitor: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
  dailyTrend: DailyTrendEntry[];
  sources: { name: string; visitors: number; percentage: number }[];
  pages: { path: string; visitors: number }[];
  devices: {
    mobile: { count: number; percentage: number };
    desktop: { count: number; percentage: number };
  };
  countries: { code: string; name: string; visitors: number }[];
}

export function useWebsiteAnalytics(days = 30) {
  return useQuery<WebsiteAnalytics>({
    queryKey: ["website-analytics", days],
    queryFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/admin-website-analytics?days=${days}`;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${session?.access_token || ""}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) throw new Error(`Analytics fetch failed: ${res.status}`);
      return (await res.json()) as WebsiteAnalytics;
    },
    staleTime: STALE_TIMES.ANALYTICS,
  });
}
