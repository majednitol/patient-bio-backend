import { useEffect, useState, useMemo } from "react";
import {
  useMedicationChecker,
  getSeverityColor,
  getSeverityLabel,
  getRiskColor,
  type MedicationInput,
} from "@/hooks/useMedicationChecker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MedicationInteractionBannerProps {
  medications: { medication_name: string; dosage?: string | null }[];
}

export const MedicationInteractionBanner = ({
  medications,
}: MedicationInteractionBannerProps) => {
  const { checkInteractions, isChecking, result, reset } = useMedicationChecker();
  const [expanded, setExpanded] = useState(false);

  const medInputs: MedicationInput[] = useMemo(
    () => medications.map((m) => ({ name: m.medication_name, dosage: m.dosage ?? undefined })),
    [medications]
  );

  const medKey = useMemo(
    () => medInputs.map((m) => m.name.toLowerCase()).sort().join("|"),
    [medInputs]
  );

  // Auto-check when 2+ medications exist and medication list changes
  useEffect(() => {
    if (medInputs.length >= 2) {
      reset();
      checkInteractions({ medications: medInputs });
    }
  }, [medKey]);

  if (medInputs.length < 2) return null;

  if (isChecking && !result) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking medication interactions…
      </div>
    );
  }

  if (!result) return null;

  const hasIssues = result.interactions.length > 0 || result.generalWarnings.length > 0;
  const isHigh = result.overallRisk === "high";
  const isMod = result.overallRisk === "moderate";

  if (!hasIssues) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
        <span className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-4 w-4" />
          No medication interactions detected
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => checkInteractions({ medications: medInputs })}
          disabled={isChecking}
        >
          <RefreshCw className={cn("h-3 w-3", isChecking && "animate-spin")} />
        </Button>
      </div>
    );
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div
        className={cn(
          "rounded-lg border overflow-hidden",
          isHigh
            ? "border-destructive/50 bg-destructive/5"
            : isMod
            ? "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20"
            : "border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20"
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-3 text-left"
          >
            <div className="flex items-center gap-2">
              {isHigh ? (
                <ShieldAlert className="h-4 w-4 text-destructive" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              )}
              <span className="text-sm font-medium">
                {result.interactions.length} interaction
                {result.interactions.length !== 1 ? "s" : ""} found
              </span>
              <Badge
                variant={isHigh ? "destructive" : "secondary"}
                className="text-xs"
              >
                {result.overallRisk} risk
              </Badge>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2 border-t pt-2">
            {result.interactions.map((interaction, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm p-2 rounded border",
                  getSeverityColor(interaction.severity)
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">
                    {interaction.medication1} + {interaction.medication2}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getSeverityLabel(interaction.severity)}
                  </Badge>
                </div>
                <p className="text-xs">{interaction.description}</p>
                <p className="text-xs mt-1 opacity-80">
                  → {interaction.recommendation}
                </p>
              </div>
            ))}

            {result.generalWarnings.map((w, i) => (
              <div
                key={`gw-${i}`}
                className="text-xs text-muted-foreground p-2 rounded bg-muted"
              >
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
              onClick={() => checkInteractions({ medications: medInputs })}
              disabled={isChecking}
              className="w-full"
            >
              {isChecking ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Re-check Interactions
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
