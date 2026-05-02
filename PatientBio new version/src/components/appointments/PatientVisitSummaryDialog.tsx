import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVisitSummaryByAppointment } from "@/hooks/useVisitSummary";
import { generateVisitInstructionsPDF } from "@/utils/generateVisitInstructionsPDF";
import {
  FileText,
  Stethoscope,
  Pill,
  CalendarCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface PatientVisitSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  doctorName?: string;
  appointmentDate?: string;
}

export function PatientVisitSummaryDialog({
  open,
  onOpenChange,
  appointmentId,
  doctorName,
  appointmentDate,
}: PatientVisitSummaryDialogProps) {
  const { data: summary, isLoading } = useVisitSummaryByAppointment(
    open ? appointmentId : null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Visit Summary
          </DialogTitle>
          {(doctorName || appointmentDate) && (
            <p className="text-sm text-muted-foreground">
              {doctorName && `Dr. ${doctorName}`}
              {doctorName && appointmentDate && " · "}
              {appointmentDate &&
                format(new Date(appointmentDate), "MMM d, yyyy")}
            </p>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              Loading summary...
            </p>
          </div>
        ) : !summary || !summary.is_approved ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
            <p className="text-sm font-medium">No summary available</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Your doctor hasn't published a visit summary for this
              appointment yet.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approved by Doctor
                </Badge>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      const doc = generateVisitInstructionsPDF({
                        doctorName,
                        date: appointmentDate || new Date().toISOString(),
                        diagnosis: summary.diagnosis || undefined,
                        summaryText: summary.summary_text || undefined,
                        medications: summary.medications_summary || undefined,
                        followUpInstructions: summary.follow_up_instructions || undefined,
                      });
                      doc.save(`visit-instructions-${format(new Date(appointmentDate || new Date()), "yyyy-MM-dd")}.pdf`);
                    }}
                  >
                    <Download className="h-3 w-3" />
                    PDF
                  </Button>
                  {typeof navigator !== "undefined" && navigator.share && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={async () => {
                        const text = [
                          `Visit Summary — ${format(new Date(appointmentDate || new Date()), "MMM d, yyyy")}`,
                          doctorName ? `Doctor: Dr. ${doctorName}` : "",
                          summary.diagnosis ? `Diagnosis: ${summary.diagnosis}` : "",
                          summary.medications_summary ? `Medications: ${summary.medications_summary}` : "",
                          summary.follow_up_instructions ? `Follow-up: ${summary.follow_up_instructions}` : "",
                        ].filter(Boolean).join("\n");
                        try {
                          await navigator.share({ title: "Visit Instructions", text });
                        } catch {
                          // User cancelled
                        }
                      }}
                    >
                      <Share2 className="h-3 w-3" />
                      Share
                    </Button>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Summary
                </p>
                <p className="text-sm leading-relaxed">
                  {summary.summary_text}
                </p>
              </div>

              {/* Diagnosis */}
              {summary.diagnosis && (
                <>
                  <Separator />
                  <div className="flex gap-3 items-start">
                    <Stethoscope className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Diagnosis
                      </p>
                      <p className="text-sm mt-1">{summary.diagnosis}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Medications */}
              {summary.medications_summary && (
                <>
                  <Separator />
                  <div className="flex gap-3 items-start">
                    <Pill className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Medications
                      </p>
                      <p className="text-sm mt-1">
                        {summary.medications_summary}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Follow-up */}
              {summary.follow_up_instructions && (
                <>
                  <Separator />
                  <div className="flex gap-3 items-start">
                    <CalendarCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Follow-up Instructions
                      </p>
                      <p className="text-sm mt-1">
                        {summary.follow_up_instructions}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Disclaimer */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg mt-4">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  This summary was reviewed and approved by your doctor. If you
                  have any questions, please contact your healthcare provider.
                </p>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
