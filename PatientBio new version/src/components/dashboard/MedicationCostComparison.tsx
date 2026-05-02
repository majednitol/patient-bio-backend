import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowDown, DollarSign, TrendingDown, Pill, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface MedicationCostComparisonProps {
  medications: MedicationItem[];
}

interface PriceResult {
  medication_name: string;
  avg_price: number;
  unit: string;
  category: string;
}

interface AlternativeInfo {
  originalName: string;
  originalPrice: number;
  alternativeName: string;
  alternativePrice: number;
  unit: string;
  savingsPercent: number;
  savingsAmount: number;
}

export function MedicationCostComparison({ medications }: MedicationCostComparisonProps) {
  const { t } = useTranslation();
  const medNames = medications.map((m) => m.name);

  const { data, isLoading } = useQuery({
    queryKey: ["patient-med-costs", medNames.join(",")],
    enabled: medNames.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const orFilter = medNames
        .map((n) => `medication_name.ilike.%${n.split(" ")[0]}%`)
        .join(",");

      const { data: prices } = await supabase
        .from("medication_prices")
        .select("medication_name, avg_price, unit, category")
        .or(orFilter);

      if (!prices?.length) return { prices: [] as PriceResult[], alternatives: [] as AlternativeInfo[] };

      const matchedPrices: PriceResult[] = [];
      const categories = new Set<string>();

      for (const med of medNames) {
        const keyword = med.split(" ")[0].toLowerCase();
        const match = prices.find((p) =>
          p.medication_name.toLowerCase().includes(keyword)
        );
        if (match) {
          matchedPrices.push(match);
          if (match.category) categories.add(match.category);
        }
      }

      const alternatives: AlternativeInfo[] = [];
      if (categories.size > 0) {
        const { data: allInCategories } = await supabase
          .from("medication_prices")
          .select("medication_name, avg_price, unit, category")
          .in("category", Array.from(categories))
          .order("avg_price", { ascending: true });

        for (const matched of matchedPrices) {
          const cheaper = (allInCategories || []).find(
            (alt) =>
              alt.category === matched.category &&
              alt.avg_price < matched.avg_price * 0.8 &&
              alt.medication_name !== matched.medication_name
          );
          if (cheaper) {
            const savings = matched.avg_price - cheaper.avg_price;
            alternatives.push({
              originalName: matched.medication_name,
              originalPrice: matched.avg_price,
              alternativeName: cheaper.medication_name,
              alternativePrice: cheaper.avg_price,
              unit: cheaper.unit,
              savingsPercent: Math.round((savings / matched.avg_price) * 100),
              savingsAmount: savings,
            });
          }
        }
      }

      return { prices: matchedPrices, alternatives };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t("medications.checkingPrices")}
      </div>
    );
  }

  if (!data || (data.prices.length === 0 && data.alternatives.length === 0)) {
    return null;
  }

  const totalEstimated = data.prices.reduce((sum, p) => sum + p.avg_price, 0);
  const totalSavings = data.alternatives.reduce((sum, a) => sum + a.savingsAmount, 0);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
        <DollarSign className="h-4 w-4" />
        {t("medications.costAndAlternatives")}
      </h3>

      {data.prices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.prices.map((price) => {
            const alt = data.alternatives.find(
              (a) => a.originalName === price.medication_name
            );
            return (
              <div
                key={price.medication_name}
                className={cn(
                  "rounded-lg border p-3 space-y-2",
                  alt ? "border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-950/10" : "bg-muted/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{price.medication_name}</p>
                    <p className="text-xs text-muted-foreground">
                      ৳{price.avg_price.toLocaleString("en-BD")} {price.unit}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {price.category}
                  </Badge>
                </div>

                {alt && (
                  <>
                    <Separator className="my-1" />
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-green-100 dark:bg-green-900/30">
                        <TrendingDown className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-green-700 dark:text-green-400">
                            {t("medications.genericAlternative")}
                          </span>
                          <Badge className="text-[9px] px-1 py-0 bg-green-600 text-white border-0">
                            <ArrowDown className="h-2 w-2 mr-0.5" />
                            {t("medications.savePercent", { percent: alt.savingsPercent })}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium">{alt.alternativeName}</span> — ৳{alt.alternativePrice.toLocaleString("en-BD")} {alt.unit}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalSavings > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40">
          <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/40">
            <TrendingDown className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-green-700 dark:text-green-400">
              {t("medications.potentialSavings", { amount: totalSavings.toLocaleString("en-BD") })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t("medications.askPharmacist")}
            </p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        {t("medications.priceDisclaimer")}
      </p>
    </div>
  );
}