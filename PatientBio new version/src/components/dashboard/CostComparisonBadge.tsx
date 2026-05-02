import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";

interface CostComparisonBadgeProps {
  doctorId: string;
  specialty?: string | null;
}

export function CostComparisonBadge({ doctorId, specialty }: CostComparisonBadgeProps) {
  const { data } = useQuery({
    queryKey: ["fee-comparison", doctorId, specialty],
    enabled: !!doctorId && !!specialty,
    staleTime: STALE_TIMES.STANDARD,
    queryFn: async () => {
      // Get this doctor's fee
      const { data: doc } = await supabase
        .from("doctor_profiles")
        .select("consultation_fee")
        .eq("user_id", doctorId)
        .single();

      if (!doc?.consultation_fee) return null;

      // Get average fee for the specialty
      const { data: others } = await supabase
        .from("doctor_profiles")
        .select("consultation_fee")
        .eq("specialty", specialty!)
        .not("consultation_fee", "is", null);

      if (!others?.length) return null;

      const fees = others.map((d) => d.consultation_fee!).filter((f) => f > 0);
      if (fees.length < 2) return null;

      const avg = fees.reduce((s, f) => s + f, 0) / fees.length;
      const diff = ((doc.consultation_fee - avg) / avg) * 100;

      return { fee: doc.consultation_fee, avg: Math.round(avg), diffPercent: Math.round(diff) };
    },
  });

  if (!data) return null;

  const { diffPercent } = data;
  const isBelow = diffPercent < -5;
  const isAbove = diffPercent > 5;

  if (!isBelow && !isAbove) return null;

  return (
    <Badge
      variant="outline"
      className={`text-[10px] gap-1 ${
        isBelow
          ? "text-green-700 border-green-300 bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
          : "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
      }`}
    >
      {isBelow ? <TrendingDown className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}
      {Math.abs(diffPercent)}% {isBelow ? "below" : "above"} avg
    </Badge>
  );
}
