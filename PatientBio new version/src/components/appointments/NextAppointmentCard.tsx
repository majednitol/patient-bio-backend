import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Appointment } from "@/types/hospital";
import { Clock, Calendar, MapPin, Video, ArrowRight, Timer, CheckCircle2, Loader2, CircleDot, Play, Check, CalendarClock } from "lucide-react";
import { format, parseISO, formatDistanceToNow, isToday } from "date-fns";
import { useEstimatedWaitTime } from "@/hooks/useConsultationTimer";
import { usePatientCheckIn } from "@/hooks/usePatientCheckIn";
import { LiveQueuePositionCard } from "@/components/dashboard/LiveQueuePositionCard";
import { formatDoctorName } from "@/utils/formatDoctorName";
interface NextAppointmentCardProps {
  appointment: Appointment;
  onCancel: (appointment: Appointment) => void;
  onReschedule?: (appointment: Appointment) => void;
  onViewDetails?: (appointment: Appointment) => void;
}

const STATUS_STEPS = [
  { key: "scheduled", label: "Booked", icon: CircleDot },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "checked_in", label: "Checked In", icon: Check },
  { key: "in_progress", label: "In Progress", icon: Play },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
];

function getStatusIndex(appointment: Appointment): number {
  if (appointment.status === "completed") return 4;
  if ((appointment as any).consultation_started_at) return 3;
  if (appointment.checked_in_at) return 2;
  if (appointment.status === "confirmed") return 1;
  return 0;
}

export function NextAppointmentCard({ appointment, onCancel, onReschedule, onViewDetails }: NextAppointmentCardProps) {
  const checkIn = usePatientCheckIn();
  const isAppointmentToday = isToday(parseISO(appointment.appointment_date));
  const hasCheckedIn = !!appointment.checked_in_at;
  const currentStep = getStatusIndex(appointment);
  const { data: waitMinutes } = useEstimatedWaitTime({
    doctor_id: appointment.doctor_id,
    appointment_date: appointment.appointment_date,
    start_time: appointment.start_time,
    status: appointment.status,
  });

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/[0.06] via-background to-secondary/[0.04] shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10">
      <CardContent className="p-0">
        <div className="p-2 sm:p-6">
          <div className="flex items-center justify-between gap-1.5 mb-2 sm:mb-4 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <Badge variant="secondary" className="bg-primary text-primary-foreground font-semibold text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5">
                Next Appointment
              </Badge>
              <span className="text-[9px] sm:text-sm text-muted-foreground font-medium">
                {formatDistanceToNow(parseISO(appointment.appointment_date), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {onReschedule && appointment.status !== "completed" && appointment.status !== "cancelled" && (
                <Button variant="outline" size="sm" className="bg-background h-6 sm:h-8 text-[9px] sm:text-xs px-1.5 sm:px-3 gap-1" onClick={() => onReschedule(appointment)}>
                  <CalendarClock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Reschedule
                </Button>
              )}
              <Button variant="outline" size="sm" className="bg-background h-6 sm:h-8 text-[9px] sm:text-xs px-1.5 sm:px-3" onClick={() => onCancel(appointment)}>
                Cancel
              </Button>
              <Button size="sm" className="gap-1 h-6 sm:h-8 text-[9px] sm:text-xs px-1.5 sm:px-3" onClick={() => onViewDetails?.(appointment)}>
                Details
                <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
            </div>
          </div>

          {/* Status Progression Bar */}
          {appointment.status !== "cancelled" && (
            <div className="mb-2.5 sm:mb-4 px-0">
              <div className="flex items-center justify-between relative">
                {/* Background line */}
                <div className="absolute top-3 sm:top-4 left-2.5 sm:left-4 right-2.5 sm:right-4 h-0.5 bg-muted" />
                <div
                  className="absolute top-3 sm:top-4 left-2.5 sm:left-4 h-0.5 bg-primary transition-all duration-500"
                  style={{ width: `calc(${(currentStep / (STATUS_STEPS.length - 1)) * 100}% - 1.25rem)` }}
                />
                {STATUS_STEPS.map((step, i) => {
                  const isComplete = i < currentStep;
                  const isCurrent = i === currentStep;
                  const StepIcon = step.icon;
                  return (
                    <div key={step.key} className="flex flex-col items-center z-10 relative">
                      <div
                        className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          isComplete
                            ? "bg-primary border-primary text-primary-foreground"
                            : isCurrent
                              ? "bg-primary/10 border-primary text-primary ring-2 sm:ring-4 ring-primary/20"
                              : "bg-background border-muted text-muted-foreground"
                        }`}
                      >
                        <StepIcon className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                      </div>
                      <span
                        className={`text-[8px] sm:text-[10px] mt-0.5 sm:mt-1.5 font-medium leading-tight ${
                          isComplete || isCurrent ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Check-In CTA Banner */}
          {isAppointmentToday && !hasCheckedIn && appointment.status !== "completed" && appointment.status !== "cancelled" && (
            <div className={`mb-2.5 sm:mb-4 rounded-lg border-2 border-dashed border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-2.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 ${checkIn.showSuccess ? "animate-fade-in" : ""}`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-300 text-xs sm:text-base">Ready to check in?</p>
                  <p className="text-[10px] sm:text-sm text-green-600 dark:text-green-400 leading-snug">
                    Let your doctor know you've arrived
                    {waitMinutes != null && waitMinutes > 0 && ` · ~${waitMinutes} min wait`}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-md w-full sm:w-auto sm:min-w-[140px] h-8 sm:h-9 text-xs sm:text-sm"
                onClick={() => checkIn.mutate(appointment.id)}
                disabled={checkIn.isPending}
              >
                {checkIn.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                I've Arrived
              </Button>
            </div>
          )}

          {/* Success animation after check-in */}
          {checkIn.showSuccess && (
            <div className="mb-2.5 sm:mb-4 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-2.5 sm:p-4 animate-scale-in flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-500 flex items-center justify-center animate-scale-in shrink-0">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200 text-xs sm:text-base">You're checked in! 🎉</p>
                <p className="text-[10px] sm:text-sm text-green-600 dark:text-green-400">
                  {waitMinutes != null && waitMinutes > 0
                    ? `Estimated wait: ~${waitMinutes} minutes`
                    : "Your doctor has been notified"}
                </p>
              </div>
            </div>
          )}

          {/* Checked-in badge with wait time */}
          {hasCheckedIn && !checkIn.showSuccess && (
            <div className="mb-2.5 sm:mb-4 flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <Badge className="bg-green-500/10 text-green-600 border-green-200 gap-1 text-[10px] sm:text-xs">
                <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                Checked In
              </Badge>
              {waitMinutes != null && waitMinutes > 0 && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50 text-[10px] sm:text-xs">
                  <Timer className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  ~{waitMinutes} min wait
                </Badge>
              )}
              {waitMinutes === 0 && (
                <Badge variant="outline" className="gap-1 text-green-600 border-green-300 bg-green-50 text-[10px] sm:text-xs">
                  <Timer className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  You're next!
                </Badge>
              )}
            </div>
          )}

          {/* Live Queue Position (visible when checked in) */}
          {hasCheckedIn && appointment.status !== "completed" && appointment.status !== "cancelled" && !checkIn.showSuccess && (
            <div className="mb-2.5 sm:mb-4">
              <LiveQueuePositionCard appointmentId={appointment.id} />
            </div>
          )}

          <div className="flex flex-col gap-2.5 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Avatar className="h-9 w-9 sm:h-16 sm:w-16 border-2 border-background shadow-sm shrink-0">
                <AvatarImage src={appointment.doctor_profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-xl">
                  {getInitials(appointment.doctor_profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-lg font-bold text-foreground truncate">
                  {formatDoctorName(appointment.doctor_profile?.full_name)}
                </h3>
                <p className="text-primary font-medium text-[9px] sm:text-sm">
                  {appointment.doctor_profile?.specialty || "Specialist"}
                </p>
                <div className="flex items-center gap-2 sm:gap-4 mt-0.5 sm:mt-1 flex-wrap">
                  <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-sm text-muted-foreground">
                    <Calendar className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                    {format(parseISO(appointment.appointment_date), "MMM d")}
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-sm text-muted-foreground">
                    <Clock className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                    {appointment.start_time.substring(0, 5)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-1.5 sm:gap-2 border-t pt-2 sm:pt-4">
              {appointment.hospital ? (
                <>
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm min-w-0">
                    <p className="font-semibold truncate">{appointment.hospital.name}</p>
                    <p className="text-muted-foreground text-[10px] sm:text-xs leading-relaxed">
                      {appointment.hospital.address || "In-person visit"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-semibold">Telemedicine</p>
                    <p className="text-muted-foreground text-[10px] sm:text-xs">Link will be active 5 mins before</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
