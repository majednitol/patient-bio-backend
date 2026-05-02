import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ClipboardList, Activity, MapPinCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadinessProps {
  hasIntake: boolean;
  hasCheckedIn: boolean;
  hasAllergiesOnFile?: boolean;
  onIntakeClick?: () => void;
}

const items = [
  { key: "intake", icon: ClipboardList, label: "Intake Form" },
  { key: "checkedIn", icon: MapPinCheck, label: "Checked In" },
  { key: "allergies", icon: ShieldAlert, label: "Allergies on File" },
] as const;

export function ConsultationReadinessIndicator({
  hasIntake,
  hasCheckedIn,
  hasAllergiesOnFile = false,
  onIntakeClick,
}: ReadinessProps) {
  const states: Record<string, boolean> = {
    intake: hasIntake,
    checkedIn: hasCheckedIn,
    allergies: hasAllergiesOnFile,
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-0.5">
        {items.map(({ key, icon: Icon, label }) => {
          const ready = states[key];
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "p-0.5 rounded-sm transition-colors",
                    ready
                      ? "text-green-500"
                      : "text-muted-foreground/40 hover:text-muted-foreground/70",
                    key === "intake" && !ready && onIntakeClick && "cursor-pointer"
                  )}
                  onClick={() => {
                    if (key === "intake" && !ready && onIntakeClick) onIntakeClick();
                  }}
                >
                  <Icon className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {label}: {ready ? "✓ Ready" : "✗ Missing"}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
