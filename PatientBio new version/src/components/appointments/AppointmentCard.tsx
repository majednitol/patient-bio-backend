import { formatDoctorName } from "@/utils/formatDoctorName";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Appointment, APPOINTMENT_STATUS_OPTIONS } from "@/types/hospital";
import { Clock, MoreVertical, Calendar, Stethoscope, Building2, MapPin, Repeat, ClipboardList, FileText, StickyNote, CalendarClock, Banknote, Star, Bell, BellOff, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { PatientIntakeForm } from "@/components/appointments/PatientIntakeForm";
import { PatientVisitSummaryDialog } from "@/components/appointments/PatientVisitSummaryDialog";
import { AppointmentNoteDialog } from "@/components/appointments/AppointmentNoteDialog";
import { RescheduleAppointmentDialog } from "@/components/appointments/RescheduleAppointmentDialog";
import { ConsultationFeedbackDialog } from "@/components/appointments/ConsultationFeedbackDialog";
import { CostEstimateCard } from "@/components/dashboard/CostEstimateCard";
import { EstimatedWaitBadge } from "@/components/appointments/EstimatedWaitBadge";
import { PatientBriefExpander } from "@/components/appointments/PatientBriefExpander";
import { format, parse, parseISO, differenceInDays } from "date-fns";

interface AppointmentCardProps {
  appointment: Appointment;
  viewType: "doctor" | "patient" | "admin";
  onStatusChange?: (id: string, status: Appointment["status"]) => void;
  onViewDetails?: (appointment: Appointment) => void;
  onReschedule?: (id: string, date: string, startTime: string, endTime: string) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  isRescheduling?: boolean;
  isSavingNote?: boolean;
  consultationFee?: number | null;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  reminderStatus?: "sent" | "failed" | "pending" | "none";
}

export function AppointmentCard({
  appointment,
  viewType,
  onStatusChange,
  onViewDetails,
  onReschedule,
  onUpdateNotes,
  isRescheduling,
  isSavingNote,
  consultationFee,
  selectable,
  selected,
  onSelect,
  reminderStatus = "none",
}: AppointmentCardProps) {
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [noShowRescheduleOpen, setNoShowRescheduleOpen] = useState(false);
  
  const isWithin7Days = appointment.status === "completed" && 
    differenceInDays(new Date(), parseISO(appointment.appointment_date)) <= 7;
  const statusOption = APPOINTMENT_STATUS_OPTIONS.find((s) => s.value === appointment.status);
  
  const formatTime = (time: string) => {
    try {
      const parsed = parse(time, "HH:mm:ss", new Date());
      return format(parsed, "h:mm a");
    } catch {
      return time.substring(0, 5);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const canChangeStatus = viewType === "doctor" || viewType === "admin";
  const showDoctor = viewType === "patient" || viewType === "admin";
  const showPatient = viewType === "doctor" || viewType === "admin";

  const handleNoShow = () => {
    onStatusChange?.(appointment.id, "no_show");
    // After marking no-show, prompt reschedule
    setTimeout(() => setNoShowRescheduleOpen(true), 300);
  };

  return (
    <Card className={`group relative overflow-hidden border hover:shadow-lg transition-all duration-200 rounded-xl press-feedback ${selected ? "border-primary ring-2 ring-primary/20" : "border-border/60 hover:border-border"}`}>
      <CardContent className="p-0">
        <div className="flex items-stretch">
          {/* Checkbox for multi-select */}
          {selectable && (
            <div className="flex items-center pl-2 sm:pl-3">
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelect?.(appointment.id, e.target.checked)}
                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary cursor-pointer"
              />
            </div>
          )}
          {/* Status color bar */}
          <div className={`w-1 shrink-0 rounded-l-xl ${statusOption?.color || "bg-muted"}`} />
          
          <div className="flex-1 p-2.5 sm:p-4">
            <div className="flex items-start gap-2.5 sm:gap-3">
              {/* Avatar */}
              <Avatar className="h-9 w-9 sm:h-12 sm:w-12 border-2 border-background shadow-sm shrink-0 ring-2 ring-muted/30 group-hover:ring-primary/20 transition-all">
                {showPatient && (
                  <>
                    <AvatarImage src={appointment.patient_profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm font-semibold">
                      {getInitials(appointment.patient_profile?.display_name)}
                    </AvatarFallback>
                  </>
                )}
                {showDoctor && !showPatient && (
                  <>
                    <AvatarImage src={appointment.doctor_profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-secondary/10 text-secondary text-xs sm:text-sm font-semibold">
                      {getInitials(appointment.doctor_profile?.full_name)}
                    </AvatarFallback>
                  </>
                )}
              </Avatar>

              {/* Details */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {showPatient && (
                    <p className="font-semibold text-foreground truncate text-xs sm:text-base leading-tight">
                      {appointment.patient_profile?.display_name || "Unknown Patient"}
                    </p>
                  )}
                  {showDoctor && (
                    <div className="flex flex-col">
                      <p className="font-semibold text-foreground flex items-center gap-1 text-xs sm:text-base leading-tight">
                        {formatDoctorName(appointment.doctor_profile?.full_name)}
                      </p>
                      <p className="text-[10px] sm:text-xs text-primary/80 font-medium">
                        {appointment.doctor_profile?.specialty || "Specialist"}
                      </p>
                    </div>
                  )}
                  <Badge
                    variant="outline"
                    className="border-current/30 shadow-sm text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-0 sm:py-1 ml-auto sm:ml-0"
                  >
                    <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${statusOption?.color || "bg-muted"}`} />
                    {statusOption?.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5 sm:gap-1 bg-muted/40 px-1 sm:px-2 py-0.5 rounded-md">
                    <Calendar className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-primary/70" />
                    <span className="truncate">{format(parseISO(appointment.appointment_date), "MMM d")}</span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 sm:gap-1 bg-muted/40 px-1 sm:px-2 py-0.5 rounded-md">
                    <Clock className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-primary/70" />
                    {formatTime(appointment.start_time)}
                  </span>
                  {appointment.hospital && (
                    <span className="hidden sm:inline-flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md max-w-none">
                      <Building2 className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                      <span className="truncate">{appointment.hospital.name}</span>
                    </span>
                  )}
                  {appointment.recurrence_pattern && (
                    <span className="inline-flex items-center gap-0.5 bg-primary/10 px-1 sm:px-2 py-0.5 rounded-md text-primary text-[10px] sm:text-xs">
                      <Repeat className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span className="hidden sm:inline">{appointment.recurrence_pattern === "weekly" ? "Weekly" : appointment.recurrence_pattern === "biweekly" ? "Bi-weekly" : "Monthly"}</span>
                    </span>
                  )}
                  {reminderStatus !== "none" && (
                    <span className={`inline-flex items-center gap-0.5 px-1 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs ${
                      reminderStatus === "sent" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : reminderStatus === "failed" ? "bg-destructive/10 text-destructive"
                      : "bg-muted/40 text-muted-foreground"
                    }`}>
                      {reminderStatus === "sent" ? <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> :
                       reminderStatus === "failed" ? <BellOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> :
                       <Bell className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                      <span className="hidden sm:inline">{reminderStatus === "sent" ? "Reminded" : reminderStatus === "failed" ? "Failed" : "Pending"}</span>
                    </span>
                  )}
                  {appointment.appointment_type && appointment.appointment_type !== "new_consultation" && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-2 py-0">
                      {appointment.appointment_type === "follow_up" ? "Follow-up"
                        : appointment.appointment_type === "urgent" ? "Urgent"
                        : appointment.appointment_type === "telemedicine" ? "Tele"
                        : appointment.appointment_type === "walk_in" ? "Walk-in"
                        : appointment.appointment_type}
                    </Badge>
                  )}
                </div>

                {appointment.reason && (
                  <p className="text-[10px] sm:text-sm text-muted-foreground/80 italic line-clamp-1 border-l-2 border-primary/20 pl-1.5 sm:pl-2">
                    "{appointment.reason}"
                  </p>
                )}

                {viewType === "patient" && consultationFee && consultationFee > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 rounded-md w-fit font-medium">
                    <Banknote className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    ৳{consultationFee.toLocaleString("en-BD")}
                  </span>
                )}

                {appointment.notes && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 bg-accent/40 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md w-fit max-w-full">
                    <StickyNote className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary/70 shrink-0" />
                    <span className="line-clamp-1 break-all">{appointment.notes}</span>
                  </p>
                )}

                {/* Estimated Wait + Patient Brief for doctor view */}
                {viewType === "doctor" && (
                  <div className="space-y-1">
                    <EstimatedWaitBadge
                      doctorId={appointment.doctor_id}
                      appointmentDate={appointment.appointment_date}
                      startTime={appointment.start_time}
                    />
                    <PatientBriefExpander patientId={appointment.patient_id} />
                  </div>
                )}
              </div>
            </div>

            {/* Actions - separate row on mobile */}
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/40 justify-end">
                {canChangeStatus && appointment.status !== "completed" && appointment.status !== "cancelled" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 touch-target">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {appointment.status === "scheduled" && (
                        <DropdownMenuItem onClick={() => onStatusChange?.(appointment.id, "confirmed")}>
                          Confirm Appointment
                        </DropdownMenuItem>
                      )}
                      {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
                        <>
                          <DropdownMenuItem onClick={() => onStatusChange?.(appointment.id, "completed")}>
                            Mark as Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleNoShow}>
                            Mark as No Show
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setRescheduleOpen(true)}>
                            <CalendarClock className="h-4 w-4 mr-2" />
                            Reschedule
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => setNoteOpen(true)}>
                        <StickyNote className="h-4 w-4 mr-2" />
                        {appointment.notes ? "Edit Note" : "Add Note"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onStatusChange?.(appointment.id, "cancelled")}
                        >
                          Cancel Appointment
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onViewDetails?.(appointment)}>
                        View Full Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Show note button for completed/cancelled appointments */}
                {canChangeStatus && (appointment.status === "completed" || appointment.status === "cancelled") && (
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setNoteOpen(true)}>
                    <StickyNote className="h-4 w-4" />
                  </Button>
                )}

                {viewType === "patient" && appointment.status === "completed" && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] sm:text-xs gap-1 h-7 px-2"
                      onClick={() => setSummaryOpen(true)}
                    >
                      <FileText className="h-3 w-3" />
                      Summary
                    </Button>
                    {isWithin7Days && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] sm:text-xs gap-1 h-7 px-2 border-yellow-400/50 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                        onClick={() => setFeedbackOpen(true)}
                      >
                        <Star className="h-3 w-3" />
                        Rate
                      </Button>
                    )}
                  </div>
                )}

                {viewType === "patient" && appointment.status !== "completed" && appointment.status !== "cancelled" && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] sm:text-xs gap-1 h-7 px-2"
                      onClick={() => setIntakeOpen(true)}
                    >
                      <ClipboardList className="h-3 w-3" />
                      <span className="hidden sm:inline">Intake Form</span>
                      <span className="sm:hidden">Intake</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground h-7 px-2 text-[10px] sm:text-xs"
                      onClick={() => onViewDetails?.(appointment)}
                    >
                      Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 h-7 px-2 text-[10px] sm:text-xs"
                      onClick={() => onStatusChange?.(appointment.id, "cancelled")}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
      </CardContent>

      {/* Dialogs */}
      {viewType === "patient" && (
        <>
          <PatientIntakeForm
            open={intakeOpen}
            onOpenChange={setIntakeOpen}
            appointmentId={appointment.id}
            doctorName={appointment.doctor_profile?.full_name}
          />
          <PatientVisitSummaryDialog
            open={summaryOpen}
            onOpenChange={setSummaryOpen}
            appointmentId={appointment.id}
            doctorName={appointment.doctor_profile?.full_name}
            appointmentDate={appointment.appointment_date}
          />
          <ConsultationFeedbackDialog
            open={feedbackOpen}
            onOpenChange={setFeedbackOpen}
            appointmentId={appointment.id}
            doctorId={appointment.doctor_id}
            doctorName={appointment.doctor_profile?.full_name}
          />
        </>
      )}

      <AppointmentNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        currentNote={appointment.notes}
        isSaving={isSavingNote}
        onSave={(note) => {
          onUpdateNotes?.(appointment.id, note);
          setNoteOpen(false);
        }}
      />

      <RescheduleAppointmentDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        appointment={appointment}
        isRescheduling={isRescheduling}
        onReschedule={(date, startTime, endTime) => {
          onReschedule?.(appointment.id, date, startTime, endTime);
          setRescheduleOpen(false);
        }}
      />

      {/* No-show auto-reschedule prompt */}
      <RescheduleAppointmentDialog
        open={noShowRescheduleOpen}
        onOpenChange={setNoShowRescheduleOpen}
        appointment={appointment}
        isRescheduling={isRescheduling}
        onReschedule={(date, startTime, endTime) => {
          onReschedule?.(appointment.id, date, startTime, endTime);
          setNoShowRescheduleOpen(false);
        }}
      />
    </Card>
  );
}
