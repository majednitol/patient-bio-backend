import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { useAppointmentIntake } from "@/hooks/useAppointmentIntake";
import { Loader2, ClipboardList, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface IntakeViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  patientName?: string;
}

const severityConfig: Record<string, { label: string; className: string }> = {
  mild: { label: "Mild", className: "bg-green-500/10 text-green-600 border-green-200" },
  moderate: { label: "Moderate", className: "bg-amber-500/10 text-amber-600 border-amber-200" },
  severe: { label: "Severe", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function IntakeViewDialog({
  open,
  onOpenChange,
  appointmentId,
  patientName,
}: IntakeViewDialogProps) {
  const { data: intake, isLoading } = useAppointmentIntake(appointmentId);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="w-[95vw] sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Patient Intake Form
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Pre-visit information from {patientName || "patient"}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !intake ? (
          <div className="text-center py-6 text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No intake form submitted yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Submitted {format(new Date(intake.submitted_at), "MMM d, yyyy 'at' h:mm a")}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Chief Complaint</p>
              <p className="text-sm bg-muted/50 p-3 rounded-lg">{intake.chief_complaint || "—"}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Duration</p>
                <p className="text-sm">{intake.symptom_duration || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Severity</p>
                {intake.symptom_severity ? (
                  <Badge
                    variant="outline"
                    className={severityConfig[intake.symptom_severity]?.className || ""}
                  >
                    {intake.symptom_severity === "severe" && (
                      <AlertTriangle className="h-3 w-3 mr-1" />
                    )}
                    {severityConfig[intake.symptom_severity]?.label || intake.symptom_severity}
                  </Badge>
                ) : (
                  <p className="text-sm">—</p>
                )}
              </div>
            </div>

            {intake.self_medications && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Self-Medications</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{intake.self_medications}</p>
              </div>
            )}

            {intake.additional_notes && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Additional Notes</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{intake.additional_notes}</p>
              </div>
            )}
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
