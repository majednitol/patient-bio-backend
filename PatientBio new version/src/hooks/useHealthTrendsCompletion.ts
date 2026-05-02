import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { METRIC_TYPES } from "@/hooks/useHealthMetrics";

export function useHealthTrendsCompletion() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["health-trends-completion", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { data: metrics, error } = await supabase
        .from("health_metrics")
        .select("metric_type")
        .eq("user_id", user.id);

      if (error) throw error;

      const uniqueTypes = new Set((metrics ?? []).map((m) => m.metric_type));
      const filled = METRIC_TYPES.filter((mt) => uniqueTypes.has(mt.type)).length;
      return Math.round((filled / METRIC_TYPES.length) * 100);
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  return { percentage: data ?? 0, isLoading };
}
