import { Card, CardContent } from "@/components/ui/card";
import { Banknote, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { GenericAlternativeBadge } from "./GenericAlternativeBadge";

interface TreatmentCostBreakdownProps {
  consultationFee: number | null | undefined;
  medicationCount: number;
  medicationNames?: string[];
  isHospitalContext?: boolean;
}

export function TreatmentCostBreakdown({ consultationFee, medicationCount, medicationNames = [], isHospitalContext = false }: TreatmentCostBreakdownProps) {
  const { data: medPrices } = useQuery({
    queryKey: ["medication-prices", medicationNames],
    enabled: medicationNames.length > 0,
    staleTime: STALE_TIMES.LONG,
    queryFn: async () => {
      const { data } = await supabase
        .from("medication_prices")
        .select("medication_name, avg_price, unit")
        .limit(500);
      return data || [];
    },
  });

  if (!consultationFee && medicationCount === 0) return null;

  // Match medications to prices (fuzzy: check if med name contains price entry name)
  const matchedMeds = medicationNames.map((name) => {
    const match = medPrices?.find(
      (p) => name.toLowerCase().includes(p.medication_name.toLowerCase().split(" ")[0])
    );
    return { name, price: match?.avg_price || null, unit: match?.unit || "per strip" };
  });

  const estimatedMedTotal = matchedMeds.reduce((s, m) => s + (m.price || 0), 0);
  const totalEstimate = (consultationFee || 0) + estimatedMedTotal;

  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Banknote className="h-3 w-3" />
          Estimated Cost Summary
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="text-xs">Approximate cost estimate for discussion. Actual charges may vary.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {isHospitalContext ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Consultation</span>
            <span className="text-xs text-muted-foreground italic">Billed by hospital</span>
          </div>
        ) : consultationFee && consultationFee > 0 ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Consultation</span>
            <span className="font-medium">৳{consultationFee.toLocaleString("en-BD")}</span>
          </div>
        ) : null}

        {matchedMeds.length > 0 ? (
          matchedMeds.map((med, i) => (
            <div key={i} className="space-y-0.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-[60%]">{med.name}</span>
                {med.price ? (
                  <span className="font-medium">~৳{med.price.toLocaleString("en-BD")} <span className="text-[10px] text-muted-foreground">{med.unit}</span></span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Price N/A</span>
                )}
              </div>
              {med.price && <GenericAlternativeBadge medicationName={med.name} currentPrice={med.price} />}
            </div>
          ))
        ) : medicationCount > 0 ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {medicationCount} medication{medicationCount > 1 ? "s" : ""}
            </span>
            <span className="text-xs text-muted-foreground italic">Pricing varies</span>
          </div>
        ) : null}

        {totalEstimate > 0 && (
          <div className="border-t border-border/50 pt-1.5 flex items-center justify-between text-sm">
            <span className="font-medium">Est. Total</span>
            <span className="font-semibold text-foreground">
              ৳{totalEstimate.toLocaleString("en-BD")}{estimatedMedTotal === 0 && medicationCount > 0 ? "+" : ""}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
