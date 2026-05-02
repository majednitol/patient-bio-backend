import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface GenericAlternativeBadgeProps {
  medicationName: string;
  currentPrice: number | null;
}

export function GenericAlternativeBadge({ medicationName, currentPrice }: GenericAlternativeBadgeProps) {
  const { data: alternative } = useQuery({
    queryKey: ["generic-alternative", medicationName],
    enabled: !!medicationName && currentPrice != null && currentPrice > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      // First get the category of the current medication
      const { data: current } = await supabase
        .from("medication_prices")
        .select("category, avg_price")
        .ilike("medication_name", `%${medicationName.split(" ")[0]}%`)
        .limit(1)
        .maybeSingle();

      if (!current?.category) return null;

      // Find cheaper alternatives in the same category
      const { data: alternatives } = await supabase
        .from("medication_prices")
        .select("medication_name, avg_price, unit")
        .eq("category", current.category)
        .lt("avg_price", current.avg_price * 0.8) // At least 20% cheaper
        .order("avg_price", { ascending: true })
        .limit(1);

      if (!alternatives?.length) return null;

      const alt = alternatives[0];
      const savings = Math.round(((current.avg_price - alt.avg_price) / current.avg_price) * 100);

      return {
        name: alt.medication_name,
        price: alt.avg_price,
        unit: alt.unit,
        savingsPercent: savings,
      };
    },
  });

  if (!alternative) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="gap-1 text-[10px] px-1.5 py-0 border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-950/30 cursor-help"
          >
            <ArrowDown className="h-2.5 w-2.5" />
            Generic: save ~{alternative.savingsPercent}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <p className="text-xs">
            <span className="font-medium">{alternative.name}</span> — ৳{alternative.price.toLocaleString("en-BD")} {alternative.unit}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
