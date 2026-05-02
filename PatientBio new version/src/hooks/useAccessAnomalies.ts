import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AccessAnomaly {
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  accessor_name: string;
  timestamp: string;
}

export function useAccessAnomalies() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["access-anomalies", user?.id],
    enabled: !!user?.id,
    staleTime: STALE_TIMES.ANALYTICS,
    queryFn: async (): Promise<{ anomalies: AccessAnomaly[]; total_checked: number }> => {
      const { data, error } = await supabase.functions.invoke("detect-access-anomalies");
      if (error) throw error;
      return data || { anomalies: [], total_checked: 0 };
    },
  });
}
