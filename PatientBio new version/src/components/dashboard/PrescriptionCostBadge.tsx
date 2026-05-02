import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import type { Medication } from "@/hooks/usePrescriptions";

interface PrescriptionCostBadgeProps {
  medications: Medication[];
}

export function PrescriptionCostBadge({ medications }: PrescriptionCostBadgeProps) {
  const { t } = useTranslation();

  const { data: costEstimate } = useQuery({
    queryKey: ["prescription-cost", medications.map((m) => m.name).join(",")],
    enabled: medications.length > 0,
    staleTime: STALE_TIMES.REFERENCE,
    queryFn: async () => {
      const medNames = medications.map((m) => m.name.split(" ")[0].toLowerCase());
      if (medNames.length === 0) return null;

      const { data: prices } = await supabase
        .from("medication_prices")
        .select("medication_name, avg_price, unit")
        .or(medNames.map((n) => `medication_name.ilike.%${n}%`).join(","));

      if (!prices || prices.length === 0) return null;

      let totalEstimate = 0;
      let matchedCount = 0;
      const details: { name: string; price: number; unit: string }[] = [];

      medications.forEach((med) => {
        const match = prices.find((p) =>
          p.medication_name.toLowerCase().includes(med.name.split(" ")[0].toLowerCase())
        );
        if (match) {
          totalEstimate += match.avg_price;
          matchedCount++;
          details.push({ name: match.medication_name, price: match.avg_price, unit: match.unit });
        }
      });

      if (matchedCount === 0) return null;

      return {
        total: totalEstimate,
        matched: matchedCount,
        outOf: medications.length,
        details,
      };
    },
  });

  if (!costEstimate) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="gap-1 text-[10px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5 cursor-help"
          >
            <DollarSign className="h-2.5 w-2.5" />
            ~৳{costEstimate.total.toLocaleString("en-BD")}
            {costEstimate.matched < costEstimate.outOf && (
              <span className="text-muted-foreground">
                ({costEstimate.matched}/{costEstimate.outOf})
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px]">
          <p className="text-xs font-medium mb-1">{t("medications.estimatedCosts")}</p>
          {costEstimate.details.map((d, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {d.name}: ৳{d.price.toLocaleString("en-BD")} {d.unit}
            </p>
          ))}
          {costEstimate.matched < costEstimate.outOf && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              {t("medications.notInDatabase", { count: costEstimate.outOf - costEstimate.matched })}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}