import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useMedicationChecker,
  getSeverityColor,
  getSeverityLabel,
  getSeverityIcon,
  type SmartCheckInput,
  type MedicationAnalysis,
} from "@/hooks/useMedicationChecker";
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Pill,
  Heart,
  Syringe,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MedicationInteractionWarningProps {
  medications: { name?: string; dosage?: string; frequency?: string }[];
  patientAllergies?: string[];
  currentMedications?: string;
  chronicConditions?: string[];
}

export const MedicationInteractionWarning = ({
  medications,
  patientAllergies,
  currentMedications,
  chronicConditions,
}: MedicationInteractionWarningProps) => {
  const { checkInteractions, isChecking, result, reset } = useMedicationChecker();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const input: SmartCheckInput = useMemo(() => ({
    medications: medications.filter((m) => m.name?.trim()).map((m) => ({
      name: m.name!,
      dosage: m.dosage,
      frequency: m.frequency,
    })),
    allergies: patientAllergies?.filter(Boolean),
    chronicConditions: chronicConditions?.filter(Boolean),
    currentMedications,
  }), [medications, patientAllergies, chronicConditions, currentMedications]);

  const canCheck = input.medications.length >= 1 && (
    input.medications.length >= 2 ||
    (input.allergies && input.allergies.length > 0) ||
    (input.chronicConditions && input.chronicConditions.length > 0) ||
    !!currentMedications
  );

  const handleCheck = () => {
    if (!canCheck) return;
    setDismissed(false);
    checkInteractions(input);
  };

  // Reset when medications change
  useEffect(() => {
    reset();
    setDismissed(false);
  }, [medications.map((m) => m.name).join(",")]);

  if (dismissed) return null;

  // No result yet — show check button
  if (!result) {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCheck}
          disabled={!canCheck || isChecking}
          className="border-dashed gap-1.5"
        >
          {isChecking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {isChecking ? "Analyzing..." : "Smart Interaction Check"}
        </Button>
        {!canCheck && (
          <span className="text-xs text-muted-foreground">
            Need medications + context to check
          </span>
        )}
      </div>
    );
  }

  const totalIssues =
    result.interactions.length +
    result.allergyWarnings.length +
    result.conditionWarnings.length;
  const hasIssues = totalIssues > 0 || result.generalWarnings.length > 0;
  const isHighRisk = result.overallRisk === "high";
  const isMediumRisk = result.overallRisk === "moderate";

  if (!hasIssues) {
    return (
      <div className="flex items-center justify-between border rounded-lg p-3 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2 text-sm text-primary">
          <ShieldCheck className="h-4 w-4" />
          No interactions, allergy conflicts, or condition risks detected
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setDismissed(true)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden",
        isHighRisk
          ? "border-destructive/50 bg-destructive/5"
          : isMediumRisk
          ? "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20"
          : "border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20"
      )}
    >
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between p-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {isHighRisk ? (
            <ShieldAlert className="h-4 w-4 text-destructive" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          )}
          <span className="text-sm font-medium">
            {totalIssues} issue{totalIssues !== 1 ? "s" : ""} found
          </span>
          <Badge variant={isHighRisk ? "destructive" : "secondary"} className="text-xs">
            {result.overallRisk} risk
          </Badge>
          {/* Quick summary pills */}
          {result.allergyWarnings.length > 0 && (
            <Badge variant="destructive" className="text-[10px] gap-0.5">
              <Syringe className="h-2.5 w-2.5" />
              {result.allergyWarnings.length} allergy
            </Badge>
          )}
          {result.conditionWarnings.length > 0 && (
            <Badge variant="outline" className="text-[10px] gap-0.5 border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
              <Heart className="h-2.5 w-2.5" />
              {result.conditionWarnings.length} condition
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setDismissed(true); }}>
            <X className="h-3 w-3" />
          </Button>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          {/* ALLERGY WARNINGS — most critical first */}
          {result.allergyWarnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                <Syringe className="h-3 w-3" />
                ALLERGY CONFLICTS
              </p>
              {result.allergyWarnings.map((w, i) => (
                <WarningCard
                  key={`allergy-${i}`}
                  icon={getSeverityIcon(w.severity)}
                  severity={w.severity}
                  title={`${w.medication} ↔ Allergy: ${w.allergy}`}
                  description={w.description}
                  alternatives={w.alternatives}
                />
              ))}
            </div>
          )}

          {/* CONDITION WARNINGS */}
          {result.conditionWarnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                <Heart className="h-3 w-3" />
                CONDITION RISKS
              </p>
              {result.conditionWarnings.map((w, i) => (
                <WarningCard
                  key={`cond-${i}`}
                  icon={getSeverityIcon(w.severity)}
                  severity={w.severity}
                  title={`${w.medication} ↔ ${w.condition}`}
                  description={w.description}
                  recommendation={w.recommendation}
                  alternatives={w.alternatives}
                />
              ))}
            </div>
          )}

          {/* DRUG-DRUG INTERACTIONS */}
          {result.interactions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Pill className="h-3 w-3" />
                DRUG INTERACTIONS
              </p>
              {result.interactions.map((interaction, i) => (
                <WarningCard
                  key={`int-${i}`}
                  icon={getSeverityIcon(interaction.severity)}
                  severity={interaction.severity}
                  title={`${interaction.medication1} + ${interaction.medication2}`}
                  description={interaction.description}
                  recommendation={interaction.recommendation}
                  alternatives={interaction.alternatives}
                />
              ))}
            </div>
          )}

          {/* General warnings */}
          {result.generalWarnings.map((w, i) => (
            <div key={`gw-${i}`} className="text-xs text-muted-foreground p-2 rounded bg-muted">
              {w}
            </div>
          ))}

          <p className="text-[10px] text-muted-foreground italic pt-1">
            {result.disclaimer}
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCheck}
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
            Re-check Interactions
          </Button>
        </div>
      )}
    </div>
  );
};

// Shared warning card sub-component
function WarningCard({
  icon,
  severity,
  title,
  description,
  recommendation,
  alternatives,
}: {
  icon: string;
  severity: string;
  title: string;
  description: string;
  recommendation?: string;
  alternatives?: string[];
}) {
  return (
    <div className={cn("text-sm p-2.5 rounded border", getSeverityColor(severity))}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium flex items-center gap-1.5">
          <span className="text-xs">{icon}</span>
          {title}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {getSeverityLabel(severity)}
        </Badge>
      </div>
      <p className="text-xs opacity-90">{description}</p>
      {recommendation && (
        <p className="text-xs mt-1 opacity-80">→ {recommendation}</p>
      )}
      {alternatives && alternatives.length > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-[10px] font-medium opacity-70 flex items-center gap-0.5">
            <ArrowRight className="h-2.5 w-2.5" />
            Alternatives:
          </span>
          {alternatives.map((alt, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
              {alt}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
