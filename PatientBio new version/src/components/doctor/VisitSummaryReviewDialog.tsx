import { useState, useEffect } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useVisitSummaryByAppointment,
  useGenerateVisitSummary,
  useApproveVisitSummary,
  useUpdateVisitSummary,
} from "@/hooks/useVisitSummary";
import { FollowUpScheduler } from "@/components/doctor/FollowUpScheduler";
import { Loader2, FileText, CheckCircle2, Sparkles, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface VisitSummaryReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  patientName: string;
  patientId?: string;
  doctorId?: string;
  hospitalId?: string | null;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export function VisitSummaryReviewDialog({
  open,
  onOpenChange,
  appointmentId,
  patientName,
  patientId,
  doctorId,
  hospitalId,
  defaultStartTime,
  defaultEndTime,
}: VisitSummaryReviewDialogProps) {
  const { data: summary, isLoading } = useVisitSummaryByAppointment(
    open ? appointmentId : null
  );
  const generateSummary = useGenerateVisitSummary();
  const approveSummary = useApproveVisitSummary();
  const updateSummary = useUpdateVisitSummary();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    summary_text: "",
    diagnosis: "",
    medications_summary: "",
    follow_up_instructions: "",
  });

  useEffect(() => {
    if (summary) {
      setForm({
        summary_text: summary.summary_text,
        diagnosis: summary.diagnosis || "",
        medications_summary: summary.medications_summary || "",
        follow_up_instructions: summary.follow_up_instructions || "",
      });
    }
  }, [summary]);

  const handleGenerate = () => {
    generateSummary.mutate(appointmentId);
  };

  const handleApprove = async () => {
    if (!summary) return;
    if (editing) {
      await updateSummary.mutateAsync({ id: summary.id, ...form });
    }
    await approveSummary.mutateAsync(summary.id);
    setEditing(false);
    onOpenChange(false);
  };

  const isGenerating = generateSummary.isPending;
  const isApproving = approveSummary.isPending || updateSummary.isPending;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Visit Summary for {patientName}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !summary ? (
          <div className="text-center py-8 space-y-4">
            <Sparkles className="h-10 w-10 mx-auto text-primary/60" />
            <div>
              <p className="font-medium">No summary yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate an AI-powered visit summary for this patient.
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? "Generating..." : "Generate Summary"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {summary.is_approved && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Approved & Sent to Patient
              </Badge>
            )}

            {editing ? (
              <>
                <div className="space-y-2">
                  <Label>Summary</Label>
                  <Textarea
                    value={form.summary_text}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, summary_text: e.target.value }))
                    }
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Diagnosis</Label>
                  <Textarea
                    value={form.diagnosis}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, diagnosis: e.target.value }))
                    }
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Medications</Label>
                  <Textarea
                    value={form.medications_summary}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        medications_summary: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Follow-up Instructions</Label>
                  <Textarea
                    value={form.follow_up_instructions}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        follow_up_instructions: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Summary
                  </p>
                  <p className="text-sm leading-relaxed">
                    {summary.summary_text}
                  </p>
                </div>
                {summary.diagnosis && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Diagnosis
                    </p>
                    <p className="text-sm">{summary.diagnosis}</p>
                  </div>
                )}
                {summary.medications_summary && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Medications
                    </p>
                    <p className="text-sm">{summary.medications_summary}</p>
                  </div>
                )}
                {summary.follow_up_instructions && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Follow-up
                    </p>
                    <p className="text-sm">
                      {summary.follow_up_instructions}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Follow-Up Scheduler */}
            {patientId && doctorId && (
              <>
                <Separator />
                <FollowUpScheduler
                  appointmentId={appointmentId}
                  patientId={patientId}
                  doctorId={doctorId}
                  hospitalId={hospitalId}
                  defaultStartTime={defaultStartTime}
                  defaultEndTime={defaultEndTime}
                />
              </>
            )}

            <ResponsiveDialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Regenerate
              </Button>
              {!summary.is_approved && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(!editing)}
                  >
                    {editing ? "Preview" : "Edit"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3 mr-1" />
                    )}
                    Approve & Send
                  </Button>
                </>
              )}
            </ResponsiveDialogFooter>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
