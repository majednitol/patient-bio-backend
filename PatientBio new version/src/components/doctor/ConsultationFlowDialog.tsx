import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Stethoscope,
  Pill,
  FileText,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Heart,
  ClipboardList,
  Activity,
  Droplets,
  User,
  Sparkles,
  Send,
} from "lucide-react";
import { ConsultationSummaryDialog } from "./ConsultationSummaryDialog";
import { CreatePrescriptionDialog, PrescriptionPrefillData } from "./CreatePrescriptionDialog";
import { VisitSummaryReviewDialog } from "./VisitSummaryReviewDialog";
import { AutoBriefCard } from "./AutoBriefCard";
import { AIDiagnosisSuggestionCard } from "./AIDiagnosisSuggestionCard";
import { TreatmentDecisionCard } from "./TreatmentDecisionCard";
import { FollowUpScheduler } from "./FollowUpScheduler";
import { usePatientHealthData } from "@/hooks/useDoctorPatients";
import { useDoctorPrescriptions } from "@/hooks/usePrescriptions";
import { useAppointmentIntake } from "@/hooks/useAppointmentIntake";
import {
  useVisitSummaryByAppointment,
  useGenerateVisitSummary,
  useApproveVisitSummary,
  useUpdateVisitSummary,
} from "@/hooks/useVisitSummary";
import type { DiagnosisSuggestion } from "@/hooks/useDiagnosisSuggestion";
import type { TreatmentBrief } from "@/hooks/useTreatmentInsights";
import { toast } from "@/hooks/use-toast";

interface ConsultationFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    patient_id: string;
    display_name: string | null;
  };
  appointmentId: string;
  doctorId: string;
  hospitalId?: string | null;
  defaultStartTime?: string;
  defaultEndTime?: string;
  onComplete?: () => void;
}

type Step = "review" | "prescribe" | "complete";

const steps: { key: Step; label: string; icon: React.ElementType; shortLabel: string }[] = [
  { key: "review", label: "Review & AI Brief", icon: Stethoscope, shortLabel: "Review" },
  { key: "prescribe", label: "Prescribe", icon: Pill, shortLabel: "Rx" },
  { key: "complete", label: "Complete Visit", icon: FileText, shortLabel: "Done" },
];

export function ConsultationFlowDialog({
  open,
  onOpenChange,
  patient,
  appointmentId,
  doctorId,
  hospitalId,
  defaultStartTime,
  defaultEndTime,
  onComplete,
}: ConsultationFlowDialogProps) {
  const [currentStep, setCurrentStep] = useState<Step>("review");
  const [prefillData, setPrefillData] = useState<PrescriptionPrefillData | undefined>();
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());

  const markDone = (step: Step) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  };

  const handleApplyDiagnosis = (suggestion: DiagnosisSuggestion) => {
    setPrefillData({
      diagnosis: suggestion.diagnosis,
      medications: suggestion.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
      })),
      instructions: suggestion.general_instructions,
    });
    markDone("review");
    setCurrentStep("prescribe");
    toast.success("Suggestion applied to prescription");
  };

  const handleApplyTreatmentMedications = (meds: TreatmentBrief["recommended_medications"]) => {
    setPrefillData({
      medications: meds.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
      })),
    });
    markDone("review");
    setCurrentStep("prescribe");
    toast.success("Treatment applied to prescription");
  };

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="w-[95vw] sm:max-w-4xl max-h-[95vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b space-y-3">
          <ResponsiveDialogHeader className="p-0">
            <ResponsiveDialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              Consultation — {patient.display_name || "Patient"}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          {/* Step navigator */}
          <div className="flex items-center gap-1 sm:gap-2">
            {steps.map((step, i) => {
              const isActive = step.key === currentStep;
              const isDone = completedSteps.has(step.key);
              const Icon = step.icon;

              return (
                <div key={step.key} className="flex items-center gap-1 sm:gap-2">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
                  <button
                    onClick={() => setCurrentStep(step.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isDone
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.shortLabel}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content - rendered inline, no nested Dialog */}
        <ScrollArea className="flex-1" style={{ maxHeight: "calc(95vh - 120px)" }}>
          <div className="p-4 sm:p-6">
            {currentStep === "review" && (
              <ConsultationSummaryInline
                patient={patient}
                appointmentId={appointmentId}
                onApplyDiagnosis={handleApplyDiagnosis}
                onApplyTreatmentMedications={handleApplyTreatmentMedications}
                onNext={() => {
                  markDone("review");
                  setCurrentStep("prescribe");
                }}
              />
            )}

            {currentStep === "prescribe" && (
              <PrescribeInline
                patient={patient}
                hospitalId={hospitalId}
                prefillData={prefillData}
                onDone={() => {
                  markDone("prescribe");
                  setCurrentStep("complete");
                }}
                onSkip={() => setCurrentStep("complete")}
              />
            )}

            {currentStep === "complete" && (
              <CompleteInline
                appointmentId={appointmentId}
                patientName={patient.display_name || "Patient"}
                patientId={patient.patient_id}
                doctorId={doctorId}
                hospitalId={hospitalId}
                defaultStartTime={defaultStartTime}
                defaultEndTime={defaultEndTime}
                onDone={() => {
                  markDone("complete");
                  onComplete?.();
                  onOpenChange(false);
                }}
              />
            )}
          </div>
        </ScrollArea>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

// Inline wrappers that reuse existing component logic without nested dialogs

// Step 1: Review
function ConsultationSummaryInline({
  patient,
  appointmentId,
  onApplyDiagnosis,
  onApplyTreatmentMedications,
  onNext,
}: {
  patient: { patient_id: string; display_name: string | null };
  appointmentId?: string;
  onApplyDiagnosis: (s: DiagnosisSuggestion) => void;
  onApplyTreatmentMedications: (meds: TreatmentBrief["recommended_medications"]) => void;
  onNext: () => void;
}) {
  const { data, isLoading, error } = usePatientHealthData(patient.patient_id);
  const { data: prescriptions, isLoading: rxLoading } = useDoctorPrescriptions(patient.patient_id);
  const { data: intake } = useAppointmentIntake(appointmentId);

  const patientAge = useMemo(() => {
    const dob = data?.profile?.date_of_birth;
    if (!dob) return undefined;
    const bd = new Date(dob);
    const t = new Date();
    let a = t.getFullYear() - bd.getFullYear();
    const m = t.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < bd.getDate())) a--;
    return a;
  }, [data?.profile?.date_of_birth]);

  const allergiesList = useMemo(() => {
    const raw = data?.healthData?.health_allergies;
    if (!raw || raw.toLowerCase() === "none") return undefined;
    return raw.split(/[,;]/).map((a: string) => a.trim()).filter(Boolean);
  }, [data?.healthData?.health_allergies]);

  const hasAllergies = !!data?.healthData?.health_allergies && data.healthData.health_allergies.toLowerCase() !== "none";
  const last3Rx = prescriptions?.slice(0, 3) || [];

  if (isLoading || rxLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <AlertCircle className="h-10 w-10 mb-2" />
        <p className="text-sm">Failed to load patient data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Patient bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
          {data?.profile?.avatar_url && <AvatarImage src={data.profile.avatar_url} />}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {patient.display_name?.[0]?.toUpperCase() || "P"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{patient.display_name || "Unknown"}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            {patientAge !== undefined && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                <User className="h-2.5 w-2.5" />{patientAge}y
                {data?.profile?.gender ? ` · ${data.profile.gender.charAt(0).toUpperCase()}` : ""}
              </Badge>
            )}
            {data?.healthData?.blood_group && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                <Droplets className="h-2.5 w-2.5" />{data.healthData.blood_group}
              </Badge>
            )}
            {hasAllergies && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" />Allergies
              </Badge>
            )}
          </div>
        </div>
      </div>

      <AutoBriefCard patientId={patient.patient_id} appointmentId={appointmentId} enabled />

      {intake?.chief_complaint && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-3 space-y-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Pre-Visit Intake</p>
            </div>
            {intake.chief_complaint && (
              <div className="p-2.5 rounded-lg bg-background border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Chief Complaint</p>
                <p className="text-sm font-medium">{intake.chief_complaint}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {intake.symptom_duration && (
                <div className="p-2 rounded-lg bg-background border">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Duration</p>
                  <p className="text-sm">{intake.symptom_duration}</p>
                </div>
              )}
              {intake.symptom_severity && (
                <div className="p-2 rounded-lg bg-background border">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Severity</p>
                  <Badge variant="outline" className={`text-xs capitalize ${
                    intake.symptom_severity === "severe" ? "border-destructive/50 text-destructive"
                    : intake.symptom_severity === "moderate" ? "border-amber-400/50 text-amber-600 dark:text-amber-400" : ""
                  }`}>{intake.symptom_severity}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {intake?.chief_complaint && (
        <AIDiagnosisSuggestionCard
          intake={intake}
          patientAge={patientAge}
          patientGender={data?.profile?.gender || undefined}
          patientAllergies={allergiesList}
          onApplySuggestion={onApplyDiagnosis}
        />
      )}

      <TreatmentDecisionCard patientId={patient.patient_id} appointmentId={appointmentId} onApplyMedications={onApplyTreatmentMedications} />

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} className="gap-1.5">
          Next: Prescribe
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Step 2: Prescribe
function PrescribeInline({
  patient,
  hospitalId,
  prefillData,
  onDone,
  onSkip,
}: {
  patient: { patient_id: string; display_name: string | null };
  hospitalId?: string | null;
  prefillData?: PrescriptionPrefillData;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [rxOpen, setRxOpen] = useState(true);

  return (
    <div className="space-y-4">
      <div className="text-center py-8 space-y-4">
        <Pill className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-primary/60" />
        <div>
          <p className="font-medium">Prescribe Medications</p>
          <p className="text-sm text-muted-foreground mt-1">
            {prefillData?.diagnosis
              ? `AI suggested: ${prefillData.diagnosis}`
              : "Create a prescription for this patient."}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => setRxOpen(true)} className="gap-1.5">
            <Pill className="h-4 w-4" />
            {prefillData ? "Review & Edit Prescription" : "Create Prescription"}
          </Button>
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
            Skip
          </Button>
        </div>
      </div>

      <CreatePrescriptionDialog
        open={rxOpen}
        onOpenChange={(open) => {
          setRxOpen(open);
          if (!open) onDone();
        }}
        patient={patient}
        hospitalId={hospitalId || undefined}
        initialData={prefillData}
      />

      <div className="flex justify-end pt-2">
        <Button onClick={onDone} variant="outline" className="gap-1.5">
          Next: Complete
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Step 3: Complete
function CompleteInline({
  appointmentId,
  patientName,
  patientId,
  doctorId,
  hospitalId,
  defaultStartTime,
  defaultEndTime,
  onDone,
}: {
  appointmentId: string;
  patientName: string;
  patientId: string;
  doctorId: string;
  hospitalId?: string | null;
  defaultStartTime?: string;
  defaultEndTime?: string;
  onDone: () => void;
}) {
  const { data: summary, isLoading } = useVisitSummaryByAppointment(appointmentId);
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

  // Outcome tracking state
  const [outcomeStatus, setOutcomeStatus] = useState<string>("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [treatmentPlanId, setTreatmentPlanId] = useState<string>("");
  const [treatments, setTreatments] = useState<{ id: string; medication_name: string | null; treatment_types: string[] | null }[]>([]);

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

  // Fetch patient's active treatments for linking
  useEffect(() => {
    const fetchTreatments = async () => {
      const { data } = await supabase
        .from("patient_running_treatments")
        .select("id, medication_name, treatment_types")
        .eq("user_id", patientId)
        .eq("is_active", true)
        .limit(20);
      if (data) setTreatments(data);
    };
    fetchTreatments();
  }, [patientId]);

  const handleGenerate = () => generateSummary.mutate(appointmentId);

  const handleApprove = async () => {
    if (!summary) return;
    if (editing) {
      await updateSummary.mutateAsync({ id: summary.id, ...form });
    }
    await approveSummary.mutateAsync(summary.id);

    // Save outcome fields to appointment
    const outcomeUpdate: Record<string, any> = {};
    if (outcomeStatus) outcomeUpdate.outcome_status = outcomeStatus;
    if (outcomeNotes) outcomeUpdate.outcome_notes = outcomeNotes;
    if (treatmentPlanId) outcomeUpdate.treatment_plan_id = treatmentPlanId;

    if (Object.keys(outcomeUpdate).length > 0) {
      await supabase
        .from("appointments")
        .update(outcomeUpdate as any)
        .eq("id", appointmentId);
    }

    setEditing(false);
    onDone();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12 space-y-4">
        <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-primary/60" />
        <div>
          <p className="font-medium">No summary yet</p>
          <p className="text-sm text-muted-foreground mt-1">Generate an AI-powered visit summary.</p>
        </div>
        <Button onClick={handleGenerate} disabled={generateSummary.isPending}>
          {generateSummary.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {generateSummary.isPending ? "Generating..." : "Generate Summary"}
        </Button>
      </div>
    );
  }

  const OUTCOME_OPTIONS = [
    { value: "resolved", label: "Resolved", color: "bg-emerald-500" },
    { value: "ongoing", label: "Ongoing", color: "bg-amber-500" },
    { value: "referred", label: "Referred", color: "bg-blue-500" },
    { value: "follow_up_needed", label: "Follow-up Needed", color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-4">
      {summary.is_approved && (
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved & Sent
        </Badge>
      )}

      {editing ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Summary</Label>
            <Textarea value={form.summary_text} onChange={(e) => setForm((f) => ({ ...f, summary_text: e.target.value }))} rows={4} />
          </div>
          <div className="space-y-2">
            <Label>Diagnosis</Label>
            <Textarea value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Medications</Label>
            <Textarea value={form.medications_summary} onChange={(e) => setForm((f) => ({ ...f, medications_summary: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Follow-up Instructions</Label>
            <Textarea value={form.follow_up_instructions} onChange={(e) => setForm((f) => ({ ...f, follow_up_instructions: e.target.value }))} rows={2} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
            <p className="text-sm leading-relaxed">{summary.summary_text}</p>
          </div>
          {summary.diagnosis && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Diagnosis</p>
              <p className="text-sm">{summary.diagnosis}</p>
            </div>
          )}
          {summary.medications_summary && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Medications</p>
              <p className="text-sm">{summary.medications_summary}</p>
            </div>
          )}
          {summary.follow_up_instructions && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Follow-up</p>
              <p className="text-sm">{summary.follow_up_instructions}</p>
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Outcome Recording */}
      {!summary.is_approved && (
        <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Visit Outcome
          </p>
          <div className="flex flex-wrap gap-1.5">
            {OUTCOME_OPTIONS.map((opt) => (
              <Badge
                key={opt.value}
                variant={outcomeStatus === opt.value ? "default" : "outline"}
                className="cursor-pointer text-xs px-2.5 py-1 gap-1.5"
                onClick={() => setOutcomeStatus(outcomeStatus === opt.value ? "" : opt.value)}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", opt.color)} />
                {opt.label}
              </Badge>
            ))}
          </div>
          <Textarea
            placeholder="Outcome notes (optional)..."
            value={outcomeNotes}
            onChange={(e) => setOutcomeNotes(e.target.value)}
            rows={2}
            className="text-xs"
          />
          {treatments.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Link Treatment Plan</Label>
              <select
                className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5"
                value={treatmentPlanId}
                onChange={(e) => setTreatmentPlanId(e.target.value)}
              >
                <option value="">None</option>
                {treatments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.medication_name || (t.treatment_types || []).join(", ") || "Treatment"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <FollowUpScheduler
        appointmentId={appointmentId}
        patientId={patientId}
        doctorId={doctorId}
        hospitalId={hospitalId}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
      />

      <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generateSummary.isPending}>
          {generateSummary.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
          Regenerate
        </Button>
        {!summary.is_approved && (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? "Preview" : "Edit"}
            </Button>
            <Button size="sm" onClick={handleApprove} disabled={approveSummary.isPending || updateSummary.isPending}>
              {(approveSummary.isPending || updateSummary.isPending) ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
              Approve & Complete
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
