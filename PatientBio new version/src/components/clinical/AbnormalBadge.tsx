import { AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { type RangeStatus, getStatusColor } from "@/lib/clinicalReferenceRanges";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AbnormalBadgeProps {
  status: RangeStatus;
  value: number;
  label: string;
  unit: string;
  low: number;
  high: number;
}

export function AbnormalBadge({ status, value, label, unit, low, high }: AbnormalBadgeProps) {
  if (status === "unknown") return null;

  const Icon = status === "normal" ? CheckCircle2 : status === "borderline" ? AlertCircle : AlertTriangle;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className={`h-3.5 w-3.5 inline-block ml-1 ${getStatusColor(status)}`} />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{label}: {value} {unit}</p>
          <p className="text-muted-foreground">Ref: {low}–{high} {unit}</p>
          <p className={`capitalize ${getStatusColor(status)}`}>{status}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
