import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsuranceCoverage } from "@/hooks/useInsuranceCoverage";
import { useCostEstimation } from "@/hooks/useCostEstimation";
import { ShieldCheck, Percent, Banknote } from "lucide-react";

export function InsuranceCoverageCard() {
  const { t } = useTranslation();
  const { plans, isLoadingPlans, selectedPlan, isLoadingSelected, selectPlan, isSelecting } = useInsuranceCoverage();
  const { useSpendingHistory } = useCostEstimation();
  const spending = useSpendingHistory();
  const totalSpent = spending.data?.totalSpent || 0;
  const coverageEstimate = selectedPlan ? { covered: Math.round((totalSpent * selectedPlan.coverage_percentage) / 100), outOfPocket: totalSpent - Math.round((totalSpent * selectedPlan.coverage_percentage) / 100) } : null;

  if (isLoadingPlans || isLoadingSelected) return (<Card><CardHeader className="pb-3"><Skeleton className="h-5 w-48" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>);

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />{t("walletDetails.insuranceCoverage")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">{t("walletDetails.yourPlan")}</label>
          <Select value={selectedPlan?.id || "none"} onValueChange={(val) => selectPlan(val === "none" ? null : val)} disabled={isSelecting}>
            <SelectTrigger className="w-full"><SelectValue placeholder={t("walletDetails.selectPlan")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("walletDetails.noInsurance")}</SelectItem>
              {plans.map((p) => (<SelectItem key={p.id} value={p.id}>{p.plan_name} — {p.provider_name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        {selectedPlan && (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs gap-1"><Percent className="h-3 w-3" />{t("walletDetails.coverage", { percent: selectedPlan.coverage_percentage })}</Badge>
              <Badge variant="outline" className="text-xs capitalize">{selectedPlan.coverage_type}</Badge>
              {selectedPlan.max_annual_limit && <Badge variant="outline" className="text-xs gap-1"><Banknote className="h-3 w-3" />{t("walletDetails.annualLimit", { amount: selectedPlan.max_annual_limit.toLocaleString() })}</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: t("walletDetails.consultation"), covered: selectedPlan.covers_consultation },
                { label: t("walletDetails.medication"), covered: selectedPlan.covers_medication },
                { label: t("walletDetails.labTests"), covered: selectedPlan.covers_lab_tests },
                { label: t("walletDetails.hospitalization"), covered: selectedPlan.covers_hospitalization },
              ].map((cat) => (
                <div key={cat.label} className={`flex items-center gap-1.5 p-2 rounded-md border ${cat.covered ? "border-primary/20 bg-primary/5 text-primary" : "border-border bg-muted/30 text-muted-foreground"}`}>
                  <div className={`h-2 w-2 rounded-full ${cat.covered ? "bg-primary" : "bg-muted-foreground"}`} />{cat.label}
                </div>
              ))}
            </div>
            {coverageEstimate && totalSpent > 0 && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                <p className="text-xs font-medium">{t("walletDetails.estimatedCoverageSpending")}</p>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("walletDetails.totalSpent")}</span><span className="font-medium">৳{totalSpent.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-primary">{t("walletDetails.insuranceCovers")}</span><span className="font-medium text-primary">~৳{coverageEstimate.covered.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("walletDetails.outOfPocket")}</span><span className="font-medium">~৳{coverageEstimate.outOfPocket.toLocaleString()}</span></div>
              </div>
            )}
          </>
        )}
        {!selectedPlan && <p className="text-xs text-muted-foreground">{t("walletDetails.selectPlanPrompt")}</p>}
      </CardContent>
    </Card>
  );
}