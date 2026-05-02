import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RealtimeContribution {
  id: string;
  source_jurisdiction: string;
  disease_categories: string[];
  contributed_at: string;
}

export const useGlobalPoolRealtime = () => {
  const queryClient = useQueryClient();
  const [recentContributions, setRecentContributions] = useState<RealtimeContribution[]>([]);
  const [newCount, setNewCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const dismissNotifications = useCallback(() => {
    setNewCount(0);
    setRecentContributions([]);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("global-pool-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "anonymous_health_contributions",
          filter: "is_active=eq.true",
        },
        (payload) => {
          const row = payload.new as RealtimeContribution;
          setRecentContributions((prev) => [row, ...prev].slice(0, 5));
          setNewCount((prev) => prev + 1);

          // Invalidate the pool query so data refreshes
          queryClient.invalidateQueries({ queryKey: ["global-data-pool"] });

          toast({
            title: "New contribution received",
            description: `From ${row.source_jurisdiction} — ${(row.disease_categories || []).slice(0, 2).join(", ")}`,
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { recentContributions, newCount, dismissNotifications };
};
