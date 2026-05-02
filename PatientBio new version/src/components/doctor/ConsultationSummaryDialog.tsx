import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usePatientHealthData } from "@/hooks/useDoctorPatients";
import { useDoctorPrescriptions } from "@/hooks/usePrescriptions";
import { QuickVitalsForm } from "@/components/doctor/QuickVitalsForm";
import { VitalsTrendSparkline } from "@/components/doctor/VitalsTrendSparkline";
import { useAppointmentIntake } from "@/hooks/useAppointmentIntake";
import { format } from "date-fns";
import {
  Loader2,
  AlertCircle,
  AlertTriangle,
  Pill,
  Heart,
  ClipboardList,
  FileText,
  Stethoscope,
  User,
  Calendar,
  Droplets,
  Activity,
  Brain,
  ChevronRight,
} from "lucide-react";
import { AIDiagnosisSuggestionCard } from "@/components/doctor/AIDiagnosisSuggestionCard";
import { TreatmentDecisionCard } from "@/components/doctor/TreatmentDecisionCard";
import { AutoBriefCard } from "@/components/doctor/AutoBriefCard";
import type { DiagnosisSuggestion } from "@/hooks/useDiagnosisSuggestion";

interface ConsultationSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    patient_id: string;
    display_name: string | null;
  };
  appointmentId?: string;
  onApplyDiagnosisSuggestion?: (suggestion: DiagnosisSuggestion) => void;
}

export const ConsultationSummaryDialog = ({
  open,
  onOpenChange,
  patient,
  appointmentId,
  onApplyDiagnosisSuggestion,
}: ConsultationSummaryDialogProps) => {
  const { data, isLoading, error } = usePatientHealthData(open ? patient.patient_id : null);
  const { data: prescriptions, isLoading: rxLoading } = useDoctorPrescriptions(
    open ? patient.patient_id : undefined
  );
  const { data: intake } = useAppointmentIntake(open ? appointmentId : undefined);

  const patientAge = useMemo(() => {
    const dob = data?.profile?.date_of_birth;
    if (!dob) return undefined;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }, [data?.profile?.date_of_birth]);

  const allergiesList = useMemo(() => {
    const raw = data?.healthData?.health_allergies;
    if (!raw || raw.toLowerCase() === "none") return undefined;
    return raw.split(/[,;]/).map((a: string) => a.trim()).filter(Boolean);
  }, [data?.healthData?.health_allergies]);

  const last3Rx = prescriptions?.slice(0, 3) || [];
  const hasAllergies = !!data?.healthData?.health_allergies && data.healthData.health_allergies.toLowerCase() !== "none";
  const hasChronic = !!data?.healthData?.chronic_diseases && data.healthData.chronic_diseases.toLowerCase() !== "none";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] p-0 gap-0 overflow-hidden">
        {/* Header with patient context bar */}
        <div className="px-6 pt-6 pb-0 space-y-3">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Stethoscope className="h-4.5 w-4.5 text-primary" />
              </div>
              Consultation Summary
            </DialogTitle>
          </DialogHeader>

          {/* Patient demographic bar */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              {data?.profile?.avatar_url && (
                <AvatarImage src={data.profile.avatar_url} alt={patient.display_name || "Patient"} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {patient.display_name?.[0]?.toUpperCase() || "P"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{patient.display_name || "Unknown Patient"}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                {patientAge !== undefined && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                    <User className="h-2.5 w-2.5" />
                    {patientAge}y
                    {data?.profile?.gender ? ` · ${data.profile.gender.charAt(0).toUpperCase()}` : ""}
                  </Badge>
                )}
                {data?.healthData?.blood_group && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                    <Droplets className="h-2.5 w-2.5" />
                    {data.healthData.blood_group}
                  </Badge>
                )}
                {hasAllergies && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Allergies
                  </Badge>
                )}
                {hasChronic && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 border-amber-400/50 text-amber-600 dark:text-amber-400">
                    <Activity className="h-2.5 w-2.5" />
                    Chronic
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading || rxLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertCircle className="h-10 w-10 mb-2" />
            <p className="text-sm">Failed to load patient data</p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-3">
              <TabsList className="w-full grid grid-cols-3 h-9">
                <TabsTrigger value="overview" className="text-xs gap-1.5">
                  <Brain className="h-3.5 w-3.5" />
                  AI & Intake
                </TabsTrigger>
                <TabsTrigger value="vitals" className="text-xs gap-1.5">
                  <Heart className="h-3.5 w-3.5" />
                  Vitals & Health
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Rx History
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-6 pb-6 pt-3" style={{ maxHeight: "calc(92vh - 220px)" }}>
              {/* Tab 1: AI Insights & Intake */}
              <TabsContent value="overview" className="mt-0 space-y-3">
                <AutoBriefCard
                  patientId={patient.patient_id}
                  appointmentId={appointmentId}
                  enabled={open}
                />

                {intake && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-4 pb-3 space-y-3">
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
                            <Badge
                              variant="outline"
                              className={`text-xs capitalize ${
                                intake.symptom_severity === "severe"
                                  ? "border-destructive/50 text-destructive"
                                  : intake.symptom_severity === "moderate"
                                  ? "border-amber-400/50 text-amber-600 dark:text-amber-400"
                                  : ""
                              }`}
                            >
                              {intake.symptom_severity}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {intake.self_medications && (
                        <div className="p-2 rounded-lg bg-background border">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Self Medications</p>
                          <p className="text-sm">{intake.self_medications}</p>
                        </div>
                      )}
                      {intake.additional_notes && (
                        <div className="p-2 rounded-lg bg-background border">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Additional Notes</p>
                          <p className="text-sm">{intake.additional_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {intake?.chief_complaint && (
                  <AIDiagnosisSuggestionCard
                    intake={intake}
                    patientAge={patientAge}
                    patientGender={data?.profile?.gender || undefined}
                    patientAllergies={allergiesList}
                    onApplySuggestion={onApplyDiagnosisSuggestion}
                  />
                )}

                <TreatmentDecisionCard
                  patientId={patient.patient_id}
                  appointmentId={appointmentId}
                />
              </TabsContent>

              {/* Tab 2: Vitals & Health */}
              <TabsContent value="vitals" className="mt-0 space-y-3">
                <QuickVitalsForm
                  patientId={patient.patient_id}
                  appointmentId={appointmentId}
                />

                <VitalsTrendSparkline patientId={patient.patient_id} compact />

                {/* Allergies */}
                {hasAllergies && (
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <p className="text-sm font-semibold text-destructive">Allergies</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {allergiesList ? allergiesList.map((a, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">
                            {a}
                          </Badge>
                        )) : (
                          <p className="text-sm">{data?.healthData?.health_allergies}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Key Health Info */}
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Key Health Info</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <InfoCell label="Blood Group" value={data?.healthData?.blood_group} />
                      <InfoCell label="Height" value={data?.healthData?.height} />
                      <InfoCell label="Chronic Conditions" value={data?.healthData?.chronic_diseases || "None"} />
                    </div>
                  </CardContent>
                </Card>

                {/* Current Medications */}
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Current Medications</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {data?.healthData?.current_medications || "None reported"}
                    </p>
                  </CardContent>
                </Card>

                {/* Emergency Contact */}
                {(data?.healthData?.emergency_contact_name || data?.healthData?.emergency_contact_phone) && (
                  <Card className="border-dashed">
                    <CardContent className="pt-3 pb-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Emergency Contact</p>
                        <p className="text-sm font-medium truncate">
                          {data.healthData.emergency_contact_name}
                          {data.healthData.emergency_contact_phone && ` — ${data.healthData.emergency_contact_phone}`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab 3: Prescription History */}
              <TabsContent value="history" className="mt-0 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Recent Prescriptions
                  </p>
                  <Badge variant="secondary" className="text-xs">{last3Rx.length}</Badge>
                </div>

                {last3Rx.length > 0 ? (
                  <div className="space-y-2">
                    {last3Rx.map((rx) => (
                      <Card key={rx.id} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{rx.diagnosis || "No diagnosis"}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {rx.medications.map((m) => m.name).join(" · ")}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              <Calendar className="h-2.5 w-2.5 mr-0.5" />
                              {format(new Date(rx.created_at), "MMM d")}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No previous prescriptions</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

function InfoCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="p-2 rounded-lg bg-muted/50">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
