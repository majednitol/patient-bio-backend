import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DiagnosisEntry {
  diagnosis: string;
  count: number;
}

export function useDiagnosisHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["diagnosis-history", user?.id],
    queryFn: async (): Promise<DiagnosisEntry[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("prescriptions")
        .select("diagnosis")
        .eq("doctor_id", user.id)
        .not("diagnosis", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data) return [];

      // Count frequency of each diagnosis
      const counts = new Map<string, number>();
      for (const row of data) {
        const d = (row.diagnosis as string).trim();
        if (!d) continue;
        counts.set(d, (counts.get(d) || 0) + 1);
      }

      return Array.from(counts.entries())
        .map(([diagnosis, count]) => ({ diagnosis, count }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.LONG,
  });
}
