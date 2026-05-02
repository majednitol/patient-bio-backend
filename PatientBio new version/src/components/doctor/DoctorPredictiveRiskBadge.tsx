import { usePredictiveAlerts } from "@/hooks/usePredictiveAlerts";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp } from "lucide-react";

interface Props {
  patientId: string;
}

export function DoctorPredictiveRiskBadge({ patientId }: Props) {
  const { alerts, criticalCount, warningCount } = usePredictiveAlerts(patientId);

  if (alerts.length === 0) return null;

  const variant = criticalCount > 0 ? "destructive" : "secondary";
  const label = criticalCount > 0
    ? `${criticalCount} critical prediction${criticalCount > 1 ? "s" : ""}`
    : `${warningCount} warning prediction${warningCount > 1 ? "s" : ""}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className="text-xs gap-1 cursor-help">
            <TrendingUp className="h-3 w-3" />
            Predicted Risk
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-semibold mb-1">{label}</p>
          {alerts.slice(0, 3).map((a) => (
            <p key={a.id} className="text-xs mb-0.5">• {a.title}</p>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
