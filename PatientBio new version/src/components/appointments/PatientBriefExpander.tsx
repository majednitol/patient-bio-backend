import { useState } from "react";
import { usePatientBrief } from "@/hooks/usePatientBrief";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Pill, FlaskConical, Activity, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

interface PatientBriefExpanderProps {
  patientId: string;
}

export function PatientBriefExpander({ patientId }: PatientBriefExpanderProps) {
  const [open, setOpen] = useState(false);
  const { data: brief, isLoading } = usePatientBrief(patientId, open);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-[10px] sm:text-xs text-primary/80 hover:text-primary transition-colors font-medium mt-1">
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        Patient Brief
      </CollapsibleTrigger>
      <CollapsibleContent>
        {isLoading || !brief ? (
          <div className="text-[10px] text-muted-foreground py-1">Loading...</div>
        ) : (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {brief.lastVisitDate && (
              <span className="inline-flex items-center gap-0.5 text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-md text-muted-foreground">
                <Calendar className="h-2.5 w-2.5" />
                Last: {format(parseISO(brief.lastVisitDate), "MMM d")}
              </span>
            )}
            <span className="inline-flex items-center gap-0.5 text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-md text-muted-foreground">
              <Pill className="h-2.5 w-2.5" />
              {brief.activeMedicationsCount} meds
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-md text-muted-foreground">
              <FlaskConical className="h-2.5 w-2.5" />
              {brief.pendingLabsCount} labs
            </span>
            {brief.conditions.map((c) => (
              <Badge key={c} variant="outline" className="text-[10px] px-1.5 py-0 h-auto">
                {c}
              </Badge>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
