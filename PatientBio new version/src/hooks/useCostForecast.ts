import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CostForecast {
  projected_months: Array<{
    month_offset: number;
    estimated_total: number;
    breakdown: {
      consultation: number;
      medication: number;
      lab_test: number;
      other: number;
    };
  }>;
  trend_direction: "increasing" | "decreasing" | "stable";
  summary: string;
  savings_tip: string;
}

export function useCostForecast() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["cost-forecast", user?.id],
    enabled: !!user?.id,
    staleTime: STALE_TIMES.REFERENCE,
    queryFn: async (): Promise<CostForecast | null> => {
      const { data, error } = await supabase.functions.invoke("forecast-costs");

      if (error) throw error;
      return data?.forecast || null;
    },
  });
}
