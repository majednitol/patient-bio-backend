import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import type { NoShowRisk } from "@/hooks/useNoShowPrediction";

interface NoShowRiskBadgeProps {
  risk: NoShowRisk | undefined;
}

export function NoShowRiskBadge({ risk }: NoShowRiskBadgeProps) {
  if (!risk || risk.riskLevel === "low") return null;

  const isHigh = risk.riskLevel === "high";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-5 gap-0.5 ${
              isHigh
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : "bg-amber-500/10 text-amber-600 border-amber-200"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            {isHigh ? "High" : "Med"} Risk
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium text-xs mb-1">
            No-Show Risk: {risk.riskScore}%
          </p>
          {risk.factors.length > 0 && (
            <ul className="text-xs space-y-0.5">
              {risk.factors.map((f, i) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
