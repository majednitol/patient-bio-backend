import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScoreBreakdown } from "./useHealthScore";

export interface ScoreSnapshot {
  id: string;
  user_id: string;
  score: number;
  breakdown: ScoreBreakdown;
  tracked_types: number;
  snapshot_date: string;
  created_at: string;
}

const SNAPSHOT_LS_KEY = "health_score_last_snapshot";

export const useScoreHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: snapshots, isLoading } = useQuery({
    queryKey: ["health-score-snapshots", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("health_score_snapshots")
        .select("*")
        .eq("user_id", user.id)
        .order("snapshot_date", { ascending: true })
        .limit(52); // ~1 year of weekly snapshots
      if (error) throw error;
      return (data as unknown as ScoreSnapshot[]) || [];
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.LONG,
  });

  const saveMutation = useMutation({
    mutationFn: async (params: { score: number; breakdown: ScoreBreakdown; trackedTypes: number }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const today = new Date().toISOString().slice(0, 10);

      const row = {
        user_id: user.id,
        score: params.score,
        breakdown: JSON.parse(JSON.stringify(params.breakdown)),
        tracked_types: params.trackedTypes,
        snapshot_date: today,
      };

      const { error } = await supabase
        .from("health_score_snapshots")
        .upsert([row], { onConflict: "user_id,snapshot_date" });
      if (error) throw error;
      localStorage.setItem(SNAPSHOT_LS_KEY, today);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-score-snapshots"] });
    },
  });

  const shouldSaveSnapshot = (): boolean => {
    const last = localStorage.getItem(SNAPSHOT_LS_KEY);
    if (!last) return true;
    const daysSince = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 7;
  };

  const lastSnapshot = snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const previousSnapshot = snapshots && snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const scoreChange = lastSnapshot && previousSnapshot ? lastSnapshot.score - previousSnapshot.score : null;

  return {
    snapshots: snapshots || [],
    isLoading,
    saveSnapshot: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    shouldSaveSnapshot,
    scoreChange,
    lastSnapshot,
  };
};
