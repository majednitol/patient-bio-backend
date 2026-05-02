import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ShareCompleteness {
  hasHealthData: boolean;
  recordsCount: number;
  hasClinicalRecords: boolean;
  prescriptionCount: number;
}

export const useShareDataCompleteness = (shareIds: string[]) => {
  const { user } = useAuth();

  const { data: completeness = {}, isLoading } = useQuery({
    queryKey: ["share-completeness", user?.id, shareIds],
    queryFn: async (): Promise<Record<string, ShareCompleteness>> => {
      if (!user?.id || shareIds.length === 0) return {};

      const { data, error } = await supabase.functions.invoke("check-share-completeness", {
        body: { shareIds },
      });

      if (error) {
        console.error("Error fetching share completeness:", error);
        return {};
      }

      return data?.completeness || {};
    },
    enabled: !!user?.id && shareIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  return { completeness, isLoading };
};
