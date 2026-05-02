import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface ImportQualityBadgeProps {
  /** Resource details from the import (parsed FHIR bundle info) */
  details: Record<string, any>;
}

/**
 * Shows a data quality score badge for FHIR/import events.
 * Scores completeness based on common expected fields.
 */
export function ImportQualityBadge({ details }: ImportQualityBadgeProps) {
  // Calculate quality based on available fields
  const expectedFields = [
    "totalResources",
    "processedResources",
  ];

  const total = details.totalResources || 0;
  const processed = details.processedResources || 0;

  if (total === 0) return null;

  const completionRate = total > 0 ? Math.round((processed / total) * 100) : 0;

  // Determine quality tier
  let tier: "good" | "fair" | "poor";
  let Icon: typeof CheckCircle2;
  let color: string;

  if (completionRate >= 85) {
    tier = "good";
    Icon = CheckCircle2;
    color = "text-primary border-primary/30 bg-primary/5";
  } else if (completionRate >= 50) {
    tier = "fair";
    Icon = AlertTriangle;
    color = "text-amber-600 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:bg-amber-950/20";
  } else {
    tier = "poor";
    Icon = XCircle;
    color = "text-destructive border-destructive/30 bg-destructive/5";
  }

  const missingCount = total - processed;
  const missingText = missingCount > 0 ? `${missingCount} resource${missingCount > 1 ? "s" : ""} incomplete` : "All resources imported";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 text-[10px] px-1.5 py-0 ${color} cursor-help`}>
            <Icon className="h-2.5 w-2.5" />
            {completionRate}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs font-medium">Data Quality: {tier.charAt(0).toUpperCase() + tier.slice(1)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{missingText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
