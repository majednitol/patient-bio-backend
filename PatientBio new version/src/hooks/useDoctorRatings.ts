import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";

export interface DoctorRatingStats {
  doctor_id: string;
  avg_rating: number | null;
  total_reviews: number;
  recent_avg: number | null;
}

/**
 * Fetch aggregated rating stats for a list of doctor IDs.
 * Uses the doctor_rating_stats view for efficient single-query retrieval.
 */
export function useDoctorRatings(doctorIds: string[]) {
  return useQuery({
    queryKey: ["doctor-ratings", doctorIds.sort().join(",")],
    queryFn: async (): Promise<Record<string, DoctorRatingStats>> => {
      if (doctorIds.length === 0) return {};

      const { data, error } = await supabase
        .from("doctor_rating_stats" as any)
        .select("doctor_id, avg_rating, total_reviews, recent_avg")
        .in("doctor_id", doctorIds);

      if (error) throw error;

      const map: Record<string, DoctorRatingStats> = {};
      for (const row of (data || []) as any[]) {
        map[row.doctor_id] = {
          doctor_id: row.doctor_id,
          avg_rating: row.avg_rating ? Number(row.avg_rating) : null,
          total_reviews: row.total_reviews || 0,
          recent_avg: row.recent_avg ? Number(row.recent_avg) : null,
        };
      }
      return map;
    },
    enabled: doctorIds.length > 0,
    staleTime: STALE_TIMES.STANDARD,
  });
}

/** Calculate rating bonus for smart matching */
export function getRatingBonus(stats: DoctorRatingStats | undefined): number {
  if (!stats || stats.avg_rating == null) return 0;
  const { avg_rating, total_reviews } = stats;
  if (total_reviews < 3) return 0;
  if (avg_rating >= 4.5 && total_reviews >= 5) return 8;
  if (avg_rating >= 4.0) return 5;
  if (avg_rating >= 3.5) return 2;
  return 0;
}
