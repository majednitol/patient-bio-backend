import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { Banknote } from "lucide-react";

interface CostPreviewBadgeProps {
  appointmentType: string;
}

const TYPE_COST_ESTIMATES: Record<string, { min: number; max: number }> = {
  new_consultation: { min: 500, max: 1500 },
  follow_up: { min: 300, max: 800 },
  urgent: { min: 800, max: 2500 },
  telemedicine: { min: 300, max: 1000 },
  walk_in: { min: 500, max: 1200 },
};

export function CostPreviewBadge({ appointmentType }: CostPreviewBadgeProps) {
  const estimate = TYPE_COST_ESTIMATES[appointmentType] || TYPE_COST_ESTIMATES.new_consultation;

  return (
    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs bg-accent text-accent-foreground px-2 py-1 rounded-md font-medium">
      <Banknote className="h-3 w-3" />
      Est. ৳{estimate.min.toLocaleString()} – ৳{estimate.max.toLocaleString()}
    </span>
  );
}
