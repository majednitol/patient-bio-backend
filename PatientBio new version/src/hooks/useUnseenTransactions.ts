import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

const STORAGE_KEY = "lastWalletVisit";

const getLastVisit = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const markWalletVisited = () => {
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  } catch {
    // localStorage unavailable
  }
};

export const useUnseenTransactions = () => {
  const { user } = useAuth();
  const lastVisit = getLastVisit();

  const { data: unseenCount = 0 } = useQuery({
    queryKey: ["unseen-transactions", user?.id, lastVisit],
    queryFn: async () => {
      if (!user?.id) return 0;

      let query = supabase
        .from("data_transactions")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", user.id);

      if (lastVisit) {
        query = query.gt("created_at", lastVisit);
      }

      const { count, error } = await query;
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  return { unseenCount, markWalletVisited };
};
