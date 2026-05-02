import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DayProgressBar } from "@/components/doctor/DayProgressBar";
import { NextUpPatientCard } from "@/components/doctor/NextUpPatientCard";
import { Calendar, Clock, ArrowRight, CheckCircle2, Pill, ClipboardList, Stethoscope, FileText, Timer, MapPinCheck, Users, CheckCheck, Repeat, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { useDoctorAppointments } from "@/hooks/useAppointments";
import { useDoctorHospitalContext } from "@/contexts/DoctorHospitalContext";
import { useAppointmentIntakeBatch } from "@/hooks/useAppointmentIntake";
import { useStartConsultation, useEndConsultation } from "@/hooks/useConsultationTimer";
import { STALE_TIMES } from "@/lib/queryConfig";
import { CreatePrescriptionDialog, PrescriptionPrefillData } from "@/components/doctor/CreatePrescriptionDialog";
import { IntakeViewDialog } from "@/components/doctor/IntakeViewDialog";
import { ConsultationSummaryDialog } from "@/components/doctor/ConsultationSummaryDialog";
import { VisitSummaryReviewDialog } from "@/components/doctor/VisitSummaryReviewDialog";
import { ConsultationTimerBadge } from "@/components/doctor/ConsultationTimerBadge";
import { ConsultationReadinessIndicator } from "@/components/doctor/ConsultationReadinessIndicator";
import { usePatientQueue } from "@/hooks/usePatientQueue";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { useBatchConfirmAppointments } from "@/hooks/useBatchConfirmAppointments";
import { RepeatRxButton } from "@/components/doctor/RepeatRxButton";
import { useAverageConsultationDuration } from "@/hooks/useAverageConsultationDuration";
import { PatientRiskIndicator } from "@/components/doctor/PatientRiskIndicator";
import { useNoShowPrediction } from "@/hooks/useNoShowPrediction";
import { NoShowRiskBadge } from "@/components/doctor/NoShowRiskBadge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PatientQuickContextStrip } from "@/components/doctor/PatientQuickContextStrip";
import { PatientDetailsSidebar } from "@/components/doctor/PatientDetailsSidebar";
import { ConsultationFlowDialog } from "@/components/doctor/ConsultationFlowDialog";
import { ConsultationQuickActions } from "@/components/doctor/ConsultationQuickActions";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-600 border-blue-200",
  confirmed: "bg-green-500/10 text-green-600 border-green-200",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-amber-500/10 text-amber-600 border-amber-200",
};

export const TodayAgendaCard = React.memo(function TodayAgendaCard() {
  const { effectiveDoctorId } = useStaffAccess();
  const { selectedHospitalId } = useDoctorHospitalContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { appointments, updateAppointmentStatus, isLoading } = useDoctorAppointments(
    selectedHospitalId || undefined,
    effectiveDoctorId || undefined
  );

  const { data: avgDuration } = useAverageConsultationDuration();

  const [prescribePatient, setPrescribePatient] = useState<{
    patient_id: string;
    display_name: string | null;
    prefill?: PrescriptionPrefillData;
  } | null>(null);
  const [intakeAppointmentId, setIntakeAppointmentId] = useState<string | null>(null);
  const [intakePatientName, setIntakePatientName] = useState<string>("");
  const [summaryData, setSummaryData] = useState<{
    patient: { patient_id: string; display_name: string | null };
    appointmentId: string;
  } | null>(null);
  const [visitSummaryData, setVisitSummaryData] = useState<{
    appointmentId: string;
    patientName: string;
    patientId: string;
    doctorId: string;
    hospitalId?: string | null;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  // Consultation flow state
  const [consultationFlowData, setConsultationFlowData] = useState<{
    patient: { patient_id: string; display_name: string | null };
    appointmentId: string;
    doctorId: string;
    hospitalId?: string | null;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  // Expand/collapse state per appointment
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Patient sidebar state
  const [sidebarPatient, setSidebarPatient] = useState<{
    patient_id: string;
    display_name: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
  } | null>(null);

  const startConsultation = useStartConsultation();
  const endConsultation = useEndConsultation();
  const { addToQueue, queue } = usePatientQueue(effectiveDoctorId || undefined);
  const queuedAppointmentIds = new Set(queue.map((q) => q.appointment_id));
  const batchConfirm = useBatchConfirmAppointments();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayAppointments = appointments
    .filter((a) => a.appointment_date === todayStr && a.status !== "cancelled")
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Batch fetch intake forms for today's appointments
  const appointmentIds = todayAppointments.map((a) => a.id);
  const { data: intakeForms = [] } = useAppointmentIntakeBatch(appointmentIds);
  const intakeMap = new Map(intakeForms.map((i) => [i.appointment_id, i]));

  // No-show prediction for today's patients
  const todayPatientIds = todayAppointments.map((a) => a.patient_id);
  const { data: noShowPredictions } = useNoShowPrediction(todayPatientIds, effectiveDoctorId || undefined);

  // Prefetch patient health data for visible appointments
  useEffect(() => {
    if (!user?.id || todayAppointments.length === 0) return;

    const patientIds = todayAppointments.slice(0, 5).map((a) => a.patient_id);
    patientIds.forEach((pid, i) => {
      // Stagger prefetches by 200ms each
      setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: ["patient-health-data", pid, user.id],
          queryFn: async () => {
            const { data: access } = await supabase
              .from("doctor_patient_access")
              .select("id")
              .eq("doctor_id", user.id!)
              .eq("patient_id", pid)
              .eq("is_active", true)
              .maybeSingle();
            if (!access) return null;
            const { data } = await supabase.functions.invoke("get-patient-data-for-doctor", {
              body: { patient_id: pid },
            });
            return data;
          },
          staleTime: STALE_TIMES.STANDARD,
        });
      }, i * 200);
    });
  }, [todayAppointments.length, user?.id]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-40 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 gap-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span className="truncate">Today's Schedule</span>
            {todayAppointments.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1 flex-shrink-0">
                {todayAppointments.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {(() => {
              const scheduledIds = todayAppointments
                .filter((a) => a.status === "scheduled")
                .map((a) => a.id);
              if (scheduledIds.length === 0) return null;
              return (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] sm:text-xs gap-1 h-7 sm:h-8 px-2 sm:px-3"
                  onClick={() => batchConfirm.mutate(scheduledIds)}
                  disabled={batchConfirm.isPending}
                >
                  <CheckCheck className="h-3 w-3" />
                  <span className="hidden sm:inline">Confirm All</span>
                  <span className="sm:hidden">Confirm</span>
                  <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[9px]">
                    {scheduledIds.length}
                  </Badge>
                </Button>
              );
            })()}
            <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3" asChild>
              <Link to="/doctor/appointments">
                <span className="hidden sm:inline">View All</span>
                <span className="sm:hidden">All</span>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3">
          {/* Day progress bar */}
          {todayAppointments.length > 0 && (
            <DayProgressBar
              completed={todayAppointments.filter(a => a.status === "completed").length}
              total={todayAppointments.length}
            />
          )}

          {/* Next Up patient highlight */}
          {(() => {
            const nextUp = todayAppointments.find(a => a.status === "confirmed" || a.status === "scheduled");
            return nextUp ? <NextUpPatientCard appointment={nextUp} /> : null;
          })()}

          {todayAppointments.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
              <p className="font-medium">No appointments today</p>
              <p className="text-sm">Enjoy your free day! 🎉</p>
            </div>
          ) : (
            todayAppointments.slice(0, 5).map((apt: any) => {
              const hasIntake = intakeMap.has(apt.id);
              const isExpanded = expandedId === apt.id;
              return (
                <Collapsible
                  key={apt.id}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedId(open ? apt.id : null)}
                >
                  <div className="p-2 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors space-y-1.5 sm:space-y-2">
                    {/* Top row: Avatar + Patient info + Status badge */}
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {apt.patient_profile?.display_name?.[0]?.toUpperCase() || "P"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              className="font-medium text-xs sm:text-sm truncate hover:underline hover:text-primary transition-colors text-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSidebarPatient({
                                  patient_id: apt.patient_id,
                                  display_name: apt.patient_profile?.display_name || null,
                                  gender: apt.patient_profile?.gender || null,
                                  date_of_birth: apt.patient_profile?.date_of_birth || null,
                                });
                              }}
                            >
                              {apt.patient_profile?.display_name || "Patient"}
                            </button>
                            <PatientRiskIndicator patientId={apt.patient_id} />
                            <NoShowRiskBadge risk={noShowPredictions?.[apt.patient_id]} />
                          </div>
                          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex-wrap">
                            <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                              {apt.start_time?.slice(0, 5)} - {apt.end_time?.slice(0, 5)}
                            </span>
                            {apt.reason && (
                              <>
                                <span className="hidden sm:inline">·</span>
                                <span className="truncate">{apt.reason}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {apt.consultation_started_at && (
                          <ConsultationTimerBadge
                            startedAt={apt.consultation_started_at}
                            endedAt={apt.consultation_ended_at}
                            averageDurationMinutes={avgDuration ?? undefined}
                          />
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] sm:text-xs whitespace-nowrap ${statusColors[apt.status] || ""}`}
                        >
                          {apt.status}
                        </Badge>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    {/* Indicator badges row */}
                    <div className="flex items-center gap-1.5 flex-wrap pl-10 sm:pl-12">
                      {hasIntake && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-5 cursor-pointer bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                          onClick={() => {
                            setIntakeAppointmentId(apt.id);
                            setIntakePatientName(apt.patient_profile?.display_name || "Patient");
                          }}
                        >
                          <ClipboardList className="h-3 w-3 mr-0.5" />
                          Intake
                        </Badge>
                      )}
                      {apt.checked_in_at && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-5 bg-green-500/10 text-green-600 border-green-200"
                        >
                          <MapPinCheck className="h-3 w-3 mr-0.5" />
                          Arrived
                        </Badge>
                      )}
                      {queuedAppointmentIds.has(apt.id) && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                          <Users className="h-3 w-3 mr-0.5" />
                          Queued
                        </Badge>
                      )}
                      {(apt.status === "confirmed" || apt.status === "scheduled") && (
                        <ConsultationReadinessIndicator
                          hasIntake={hasIntake}
                          hasCheckedIn={!!apt.checked_in_at}
                          onIntakeClick={undefined}
                        />
                      )}
                    </div>

                    {/* Expandable patient context strip */}
                    <CollapsibleContent>
                      <div className="pl-10 sm:pl-12 pt-1">
                        <PatientQuickContextStrip patientId={apt.patient_id} />
                      </div>
                    </CollapsibleContent>

                    {/* Quick actions bar for active consultation */}
                    {apt.consultation_started_at && !apt.consultation_ended_at && (
                      <div className="pl-10 sm:pl-12">
                        <ConsultationQuickActions
                          onPrescribe={() =>
                            setPrescribePatient({
                              patient_id: apt.patient_id,
                              display_name: apt.patient_profile?.display_name || null,
                            })
                          }
                          onAddNote={() => {
                            setSidebarPatient({
                              patient_id: apt.patient_id,
                              display_name: apt.patient_profile?.display_name || null,
                            });
                          }}
                          onOpenFlow={() => {
                            setConsultationFlowData({
                              patient: {
                                patient_id: apt.patient_id,
                                display_name: apt.patient_profile?.display_name || null,
                              },
                              appointmentId: apt.id,
                              doctorId: apt.doctor_id,
                              hospitalId: apt.hospital_id,
                              startTime: apt.start_time,
                              endTime: apt.end_time,
                            });
                          }}
                        />
                      </div>
                    )}

                    {/* Action buttons row */}
                    <div className="flex items-center gap-1.5 flex-wrap pl-10 sm:pl-12">
                      {(apt.status === "confirmed" || apt.status === "scheduled") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 gap-1"
                          onClick={() =>
                            setPrescribePatient({
                              patient_id: apt.patient_id,
                              display_name: apt.patient_profile?.display_name || null,
                            })
                          }
                        >
                          <Pill className="h-3 w-3" />
                          Rx
                        </Button>
                      )}
                      {(apt.status === "confirmed" || apt.status === "scheduled") && (
                        <RepeatRxButton
                          patientId={apt.patient_id}
                          patientName={apt.patient_profile?.display_name || null}
                          onRepeat={(prefill) =>
                            setPrescribePatient({
                              patient_id: apt.patient_id,
                              display_name: apt.patient_profile?.display_name || null,
                              prefill,
                            })
                          }
                        />
                      )}
                      {apt.checked_in_at && !queuedAppointmentIds.has(apt.id) && apt.status !== "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1"
                          onClick={() =>
                            addToQueue.mutate({
                              appointment_id: apt.id,
                              patient_id: apt.patient_id,
                              hospital_id: apt.hospital_id,
                            })
                          }
                          disabled={addToQueue.isPending}
                        >
                          <Users className="h-3 w-3" />
                          Queue
                        </Button>
                      )}
                      {apt.status === "scheduled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() =>
                            updateAppointmentStatus.mutate({
                              id: apt.id,
                              status: "confirmed",
                            })
                          }
                        >
                          Confirm
                        </Button>
                      )}
                      {apt.status === "confirmed" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={() => {
                              startConsultation.mutate(apt.id);
                              setConsultationFlowData({
                                patient: {
                                  patient_id: apt.patient_id,
                                  display_name: apt.patient_profile?.display_name || null,
                                },
                                appointmentId: apt.id,
                                doctorId: apt.doctor_id,
                                hospitalId: apt.hospital_id,
                                startTime: apt.start_time,
                                endTime: apt.end_time,
                              });
                            }}
                          >
                            <Stethoscope className="h-3 w-3" />
                            Start
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              endConsultation.mutate(apt.id);
                              setVisitSummaryData({
                                appointmentId: apt.id,
                                patientName: apt.patient_profile?.display_name || "Patient",
                                patientId: apt.patient_id,
                                doctorId: apt.doctor_id,
                                hospitalId: apt.hospital_id,
                                startTime: apt.start_time,
                                endTime: apt.end_time,
                              });
                            }}
                          >
                            Complete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Collapsible>
              );
            })
          )}
          {todayAppointments.length > 5 && (
            <p className="text-xs text-center text-muted-foreground">
              +{todayAppointments.length - 5} more appointments
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Prescribe Dialog */}
      {prescribePatient && (
        <CreatePrescriptionDialog
          open={!!prescribePatient}
          onOpenChange={(open) => !open && setPrescribePatient(null)}
          patient={prescribePatient}
          hospitalId={selectedHospitalId || undefined}
          initialData={prescribePatient.prefill}
        />
      )}

      {/* Intake View Dialog */}
      {intakeAppointmentId && (
        <IntakeViewDialog
          open={!!intakeAppointmentId}
          onOpenChange={(open) => !open && setIntakeAppointmentId(null)}
          appointmentId={intakeAppointmentId}
          patientName={intakePatientName}
        />
      )}

      {/* Consultation Summary Dialog (legacy fallback) */}
      {summaryData && (
        <ConsultationSummaryDialog
          open={!!summaryData}
          onOpenChange={(open) => !open && setSummaryData(null)}
          patient={summaryData.patient}
          appointmentId={summaryData.appointmentId}
          onApplyDiagnosisSuggestion={(suggestion) => {
            setSummaryData(null);
            setPrescribePatient({
              patient_id: summaryData.patient.patient_id,
              display_name: summaryData.patient.display_name,
              prefill: {
                diagnosis: suggestion.diagnosis,
                medications: suggestion.medications.map((m) => ({
                  name: m.name,
                  dosage: m.dosage,
                  frequency: m.frequency,
                  duration: m.duration,
                  instructions: m.instructions,
                })),
                instructions: suggestion.general_instructions,
              },
            });
          }}
        />
      )}

      {/* Unified Consultation Flow Dialog */}
      {consultationFlowData && (
        <ConsultationFlowDialog
          open={!!consultationFlowData}
          onOpenChange={(open) => !open && setConsultationFlowData(null)}
          patient={consultationFlowData.patient}
          appointmentId={consultationFlowData.appointmentId}
          doctorId={consultationFlowData.doctorId}
          hospitalId={consultationFlowData.hospitalId}
          defaultStartTime={consultationFlowData.startTime}
          defaultEndTime={consultationFlowData.endTime}
          onComplete={() => {
            endConsultation.mutate(consultationFlowData.appointmentId);
          }}
        />
      )}

      {/* Visit Summary Review Dialog */}
      {visitSummaryData && (
        <VisitSummaryReviewDialog
          open={!!visitSummaryData}
          onOpenChange={(open) => !open && setVisitSummaryData(null)}
          appointmentId={visitSummaryData.appointmentId}
          patientName={visitSummaryData.patientName}
          patientId={visitSummaryData.patientId}
          doctorId={visitSummaryData.doctorId}
          hospitalId={visitSummaryData.hospitalId}
          defaultStartTime={visitSummaryData.startTime}
          defaultEndTime={visitSummaryData.endTime}
        />
      )}

      {/* Patient Details Sidebar */}
      <PatientDetailsSidebar
        open={!!sidebarPatient}
        onOpenChange={(open) => !open && setSidebarPatient(null)}
        patient={sidebarPatient}
      />
    </>
  );
});
