import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, ShieldCheck, AlertTriangle, Info, ChevronDown, ChevronRight } from "lucide-react";
import { usePatientPrescriptions } from "@/hooks/usePrescriptions";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface InteractionResult {
  severity: "none" | "mild" | "moderate" | "severe" | "contraindicated";
  medication1: string;
  medication2: string;
  description: string;
  recommendation: string;
}

interface AnalysisResult {
  interactions: InteractionResult[];
  generalWarnings: string[];
  overallRisk: "low" | "moderate" | "high";
  disclaimer: string;
}

const SEVERITY_CONFIG: Record<string, { color: string; label: string; icon: typeof AlertTriangle }> = {
  contraindicated: { color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-300", label: "Contraindicated", icon: ShieldAlert },
  severe: { color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200", label: "Severe", icon: AlertTriangle },
  moderate: { color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200", label: "Moderate", icon: AlertTriangle },
  mild: { color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200", label: "Mild", icon: Info },
  none: { color: "bg-muted text-muted-foreground", label: "None", icon: Info },
};

const RISK_CONFIG: Record<string, { color: string; icon: typeof ShieldCheck; label: string }> = {
  low: { color: "text-emerald-600 dark:text-emerald-400", icon: ShieldCheck, label: "Low Risk" },
  moderate: { color: "text-amber-600 dark:text-amber-400", icon: AlertTriangle, label: "Moderate Risk" },
  high: { color: "text-red-600 dark:text-red-400", icon: ShieldAlert, label: "High Risk" },
};

export function MedicationInteractionChecker() {
  const { t } = useTranslation();
  const { data: prescriptions = [], isLoading: rxLoading } = usePatientPrescriptions();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const activeMedications = useMemo(() => {
    const meds: { name: string; dosage?: string; frequency?: string }[] = [];
    const seen = new Set<string>();

    prescriptions
      .filter((p) => p.is_active)
      .forEach((p) => {
        p.medications.forEach((m) => {
          const key = m.name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            meds.push({ name: m.name, dosage: m.dosage, frequency: m.frequency });
          }
        });
      });

    return meds;
  }, [prescriptions]);

  const checkInteractions = async () => {
    if (activeMedications.length < 2) return;

    setChecking(true);
    setError(null);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("check-medication-interactions", {
        body: { medications: activeMedications },
      });

      if (response.error) throw new Error(response.error.message);

      const data = response.data;
      if (data?.success && data.data) {
        setResult(data.data);
        setExpanded(true);
      } else {
        throw new Error(data?.error || "Unexpected response");
      }
    } catch (err: any) {
      setError(err.message || "Failed to check interactions");
    } finally {
      setChecking(false);
    }
  };

  if (rxLoading) return null;
  if (activeMedications.length < 2) return null;

  const riskConfig = result ? RISK_CONFIG[result.overallRisk] : null;
  const RiskIcon = riskConfig?.icon || ShieldCheck;

  return (
    <Card className="border-dashed">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <CardTitle className="text-sm sm:text-base leading-tight">{t("interactionChecker.title")}</CardTitle>
                {result && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                )}
              </div>
              <CardDescription className="text-[11px] sm:text-xs mt-0.5">
                {t("interactionChecker.subtitle", { count: activeMedications.length })}
              </CardDescription>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {result && (
                  <Badge className={`text-[10px] px-2 py-0.5 ${riskConfig?.color || ""}`}>
                    <RiskIcon className="h-3 w-3 mr-1" />
                    {riskConfig?.label}
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant={result ? "outline" : "default"}
                  className="text-xs h-7 px-2.5"
                  onClick={checkInteractions}
                  disabled={checking}
                >
                  {checking ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      {t("interactionChecker.checking")}
                    </>
                  ) : result ? (
                    t("interactionChecker.recheck")
                  ) : (
                    t("interactionChecker.checkNow")
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 px-3 sm:px-6 space-y-3">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {result && (
              <>
                {result.interactions.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("interactionChecker.interactionsFound", { count: result.interactions.length })}
                    </h4>
                    {result.interactions.map((interaction, i) => {
                      const config = SEVERITY_CONFIG[interaction.severity] || SEVERITY_CONFIG.none;
                      const SevIcon = config.icon;
                      return (
                        <div
                          key={i}
                          className={`rounded-lg border p-3 ${config.color}`}
                        >
                          <div className="flex items-start gap-2">
                            <SevIcon className="h-4 w-4 mt-0.5 shrink-0" />
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm capitalize">{interaction.medication1}</span>
                                <span className="text-xs text-muted-foreground">×</span>
                                <span className="font-medium text-sm capitalize">{interaction.medication2}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {config.label}
                                </Badge>
                              </div>
                              <p className="text-xs">{interaction.description}</p>
                              <p className="text-xs opacity-80 italic">{interaction.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2.5">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">{t("interactionChecker.noInteractions")}</span>
                  </div>
                )}

                {result.generalWarnings.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("interactionChecker.generalPrecautions")}
                    </h4>
                    {result.generalWarnings.map((warning, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground/60 border-t border-border/40 pt-2">
                  {result.disclaimer}
                </p>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
