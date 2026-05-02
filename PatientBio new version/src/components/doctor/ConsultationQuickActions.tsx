import { Button } from "@/components/ui/button";
import { Pill, FlaskConical, StickyNote, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConsultationQuickActionsProps {
  onPrescribe: () => void;
  onOrderLab?: () => void;
  onAddNote?: () => void;
  onOpenFlow?: () => void;
  className?: string;
}

/**
 * Floating quick-action bar shown during active consultation.
 * Reduces context switching by keeping key actions within reach.
 */
export function ConsultationQuickActions({
  onPrescribe,
  onOrderLab,
  onAddNote,
  onOpenFlow,
  className,
}: ConsultationQuickActionsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 p-1.5 rounded-lg bg-primary/5 border border-primary/20",
        className
      )}
    >
      <Button
        size="sm"
        variant="ghost"
        className="text-[11px] h-7 gap-1 px-2 hover:bg-primary/10 hover:text-primary"
        onClick={onPrescribe}
      >
        <Pill className="h-3 w-3" />
        Quick Rx
      </Button>
      {onOrderLab && (
        <Button
          size="sm"
          variant="ghost"
          className="text-[11px] h-7 gap-1 px-2 hover:bg-primary/10 hover:text-primary"
          onClick={onOrderLab}
        >
          <FlaskConical className="h-3 w-3" />
          Lab
        </Button>
      )}
      {onAddNote && (
        <Button
          size="sm"
          variant="ghost"
          className="text-[11px] h-7 gap-1 px-2 hover:bg-primary/10 hover:text-primary"
          onClick={onAddNote}
        >
          <StickyNote className="h-3 w-3" />
          Note
        </Button>
      )}
      {onOpenFlow && (
        <Button
          size="sm"
          className="text-[11px] h-7 gap-1 px-2"
          onClick={onOpenFlow}
        >
          <Stethoscope className="h-3 w-3" />
          Full Consult
        </Button>
      )}
    </div>
  );
}
