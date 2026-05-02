import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RiskFlag, RiskLevel } from "@/hooks/usePatientRiskFlags";

interface PatientRiskBadgeProps {
  flags: RiskFlag[];
  highestLevel: RiskLevel | null;
  compact?: boolean;
}

const levelConfig: Record<
  RiskLevel,
  { icon: typeof AlertTriangle; className: string; label: string; pulse: boolean }
> = {
  critical: {
    icon: AlertTriangle,
    className: "bg-destructive/15 text-destructive border-destructive/30",
    label: "Critical",
    pulse: true,
  },
  warning: {
    icon: AlertCircle,
    className: "bg-amber-500/15 text-amber-600 border-amber-300",
    label: "Warning",
    pulse: false,
  },
  info: {
    icon: Info,
    className: "bg-blue-500/10 text-blue-600 border-blue-200",
    label: "Info",
    pulse: false,
  },
};

export function PatientRiskBadge({ flags, highestLevel, compact = true }: PatientRiskBadgeProps) {
  if (!highestLevel || flags.length === 0) return null;

  const config = levelConfig[highestLevel];
  const Icon = config.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-5 cursor-help gap-0.5",
              config.className,
              config.pulse && "animate-pulse"
            )}
          >
            <Icon className="h-3 w-3" />
            {!compact && config.label}
            {flags.length > 1 && (
              <span className="ml-0.5 font-bold">{flags.length}</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-0">
          <div className="p-2 space-y-1">
            <p className="font-semibold text-xs mb-1.5">⚠ Risk Flags ({flags.length})</p>
            {flags.map((flag) => {
              const fc = levelConfig[flag.level];
              const FlagIcon = fc.icon;
              return (
                <div key={flag.id} className="flex items-start gap-1.5 text-xs">
                  <FlagIcon className={cn("h-3 w-3 mt-0.5 flex-shrink-0", fc.className.split(" ").find(c => c.startsWith("text-")))} />
                  <div>
                    <span className="font-medium">{flag.label}:</span>{" "}
                    <span className="text-muted-foreground">{flag.detail}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
