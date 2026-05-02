import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";
import type { ScoreBreakdown } from "@/hooks/useHealthScore";

export interface PatientHealthScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
  trackedTypes: number;
  snapshotDate: string;
  label: string;
  color: string;
  scoreChange: number | null;
}

function getLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "text-green-600" };
  if (score >= 60) return { label: "Good", color: "text-blue-600" };
  if (score >= 40) return { label: "Fair", color: "text-yellow-600" };
  return { label: "Needs Attention", color: "text-red-600" };
}

export const usePatientHealthScore = (patientId: string | undefined) => {
  return useQuery<PatientHealthScoreResult | null>({
    queryKey: ["patient-health-score", patientId],
    queryFn: async () => {
      if (!patientId) return null;

      const { data, error } = await supabase
        .from("health_score_snapshots")
        .select("score, breakdown, tracked_types, snapshot_date")
        .eq("user_id", patientId)
        .order("snapshot_date", { ascending: false })
        .limit(2);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const latest = data[0];
      const previous = data.length > 1 ? data[1] : null;
      const breakdown = (latest.breakdown as unknown as ScoreBreakdown) || {
        coverage: 0,
        inRange: 0,
        trend: 0,
        consistency: 0,
      };
      const { label, color } = getLabel(latest.score);

      return {
        score: latest.score,
        breakdown,
        trackedTypes: latest.tracked_types ?? 0,
        snapshotDate: latest.snapshot_date,
        label,
        color,
        scoreChange: previous ? latest.score - previous.score : null,
      };
    },
    enabled: !!patientId,
    staleTime: STALE_TIMES.LONG,
  });
};
