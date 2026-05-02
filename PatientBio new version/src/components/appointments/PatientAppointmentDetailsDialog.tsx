import { formatDoctorName } from "@/utils/formatDoctorName";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Appointment, APPOINTMENT_STATUS_OPTIONS } from "@/types/hospital";
import {
  Calendar, Clock, MapPin, Video, Stethoscope, FileText,
  ClipboardList, Building2, StickyNote, Banknote, X, Activity, CalendarCheck, CalendarClock
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { useState } from "react";
import { PatientIntakeForm } from "@/components/appointments/PatientIntakeForm";
import { PatientVisitSummaryDialog } from "@/components/appointments/PatientVisitSummaryDialog";
import { cn } from "@/lib/utils";

interface PatientAppointmentDetailsDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  consultationFee?: number | null;
}

const OUTCOME_DISPLAY: Record<string, { label: string; color: string }> = {
  resolved: { label: "Resolved", color: "bg-emerald-500 text-emerald-50" },
  ongoing: { label: "Ongoing", color: "bg-amber-500 text-amber-50" },
  referred: { label: "Referred", color: "bg-blue-500 text-blue-50" },
  follow_up_needed: { label: "Follow-up Needed", color: "bg-orange-500 text-orange-50" },
};

export function PatientAppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  onCancel,
  onReschedule,
  consultationFee,
}: PatientAppointmentDetailsDialogProps) {
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  if (!appointment) return null;

  const statusOption = APPOINTMENT_STATUS_OPTIONS.find((s) => s.value === appointment.status);
  const isCancellable = appointment.status === "scheduled" || appointment.status === "confirmed";
  const isCompleted = appointment.status === "completed";

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
  };

  // Access outcome fields (cast to any since types.ts hasn't regenerated yet)
  const appt = appointment as any;
  const outcomeStatus = appt.outcome_status as string | null;
  const outcomeNotes = appt.outcome_notes as string | null;
  const followUpDate = appt.follow_up_date as string | null;
  const outcomeDisplay = outcomeStatus ? OUTCOME_DISPLAY[outcomeStatus] : null;

  const followUpCountdown = followUpDate
    ? differenceInDays(parseISO(followUpDate), new Date())
    : null;

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="text-lg">Appointment Details</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <div className="space-y-5">
            {/* Doctor Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 border-2 border-background shadow-sm ring-2 ring-primary/10">
                <AvatarImage src={appointment.doctor_profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {getInitials(appointment.doctor_profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-foreground">
                  {formatDoctorName(appointment.doctor_profile?.full_name)}
                </h3>
                <p className="text-sm text-primary font-medium">
                  {appointment.doctor_profile?.specialty || "Specialist"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">Status</span>
              <Badge variant="outline" className="border-current/30 shadow-sm text-xs font-medium px-2.5 py-1">
                <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${statusOption?.color || "bg-muted"}`} />
                {statusOption?.label || appointment.status}
              </Badge>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 bg-muted/40 rounded-lg p-3">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Date</p>
                  <p className="text-sm font-medium">{format(parseISO(appointment.appointment_date), "MMM d, yyyy")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-muted/40 rounded-lg p-3">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Time</p>
                  <p className="text-sm font-medium">
                    {appointment.start_time.substring(0, 5)} – {appointment.end_time.substring(0, 5)}
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-2 bg-muted/40 rounded-lg p-3">
              {appointment.hospital ? (
                <>
                  <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">{appointment.hospital.name}</p>
                    {appointment.hospital.address && (
                      <p className="text-xs text-muted-foreground">{appointment.hospital.address}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Telemedicine</p>
                    <p className="text-xs text-muted-foreground">Link will be active 5 mins before</p>
                  </div>
                </>
              )}
            </div>

            {/* Reason */}
            {appointment.reason && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Reason for Visit</p>
                <p className="text-sm text-foreground border-l-2 border-primary/20 pl-3 italic">
                  "{appointment.reason}"
                </p>
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div className="flex items-start gap-2 bg-accent/40 rounded-lg p-3">
                <StickyNote className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{appointment.notes}</p>
              </div>
            )}

            {/* Visit Outcome — shown for completed appointments */}
            {isCompleted && outcomeDisplay && (
              <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Visit Outcome
                  </p>
                  <Badge className={cn("text-xs", outcomeDisplay.color)}>
                    {outcomeDisplay.label}
                  </Badge>
                </div>
                {outcomeNotes && (
                  <p className="text-sm text-foreground">{outcomeNotes}</p>
                )}
                {followUpDate && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                    Follow-up: {format(parseISO(followUpDate), "MMM d, yyyy")}
                    {followUpCountdown !== null && followUpCountdown > 0 && (
                      <span className="text-primary font-medium">
                        (in {followUpCountdown} day{followUpCountdown !== 1 ? "s" : ""})
                      </span>
                    )}
                    {followUpCountdown !== null && followUpCountdown < 0 && (
                      <span className="text-destructive font-medium">
                        ({Math.abs(followUpCountdown)} day{Math.abs(followUpCountdown) !== 1 ? "s" : ""} overdue)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Consultation Fee */}
            {consultationFee && consultationFee > 0 && (
              <div className="flex items-center justify-between bg-primary/5 rounded-lg p-3">
                <span className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 text-primary" />
                  Consultation Fee
                </span>
                <span className="text-sm font-bold text-primary">৳{consultationFee.toLocaleString("en-BD")}</span>
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {!isCompleted && isCancellable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setIntakeOpen(true)}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Intake Form
                </Button>
              )}

              {isCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setSummaryOpen(true)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Visit Summary
                </Button>
              )}

              {isCancellable && onReschedule && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    onReschedule(appointment);
                    onOpenChange(false);
                  }}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Reschedule
                </Button>
              )}
              {isCancellable && onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 ml-auto"
                  onClick={() => {
                    onCancel(appointment);
                    onOpenChange(false);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel Appointment
                </Button>
              )}
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

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
    </>
  );
}
