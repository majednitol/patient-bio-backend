import { useState } from "react";
import { useMyAppointments } from "@/hooks/useAppointments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ConsultationFeedbackDialog } from "@/components/appointments/ConsultationFeedbackDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, X } from "lucide-react";
import { formatDoctorName } from "@/utils/formatDoctorName";
import { format, parseISO, differenceInDays } from "date-fns";

/**
 * Shows a prompt for patients to leave feedback on recently completed appointments.
 * Only appears when there are completed appointments within 7 days that haven't been rated.
 */
export function PostAppointmentFeedbackPrompt() {
  const { user } = useAuth();
  const { appointments } = useMyAppointments();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [feedbackTarget, setFeedbackTarget] = useState<{
    appointmentId: string;
    doctorId: string;
    doctorName: string | null;
  } | null>(null);

  // Get all completed appointments within last 7 days
  const recentCompleted = appointments.filter((a) => {
    if (a.status !== "completed") return false;
    const days = differenceInDays(new Date(), parseISO(a.appointment_date));
    return days >= 0 && days <= 7;
  });

  // Check which ones already have feedback
  const appointmentIds = recentCompleted.map((a) => a.id);
  const { data: existingFeedback } = useQuery({
    queryKey: ["feedback-check", appointmentIds.join(",")],
    queryFn: async () => {
      if (appointmentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("consultation_feedback")
        .select("appointment_id")
        .in("appointment_id", appointmentIds);
      if (error) throw error;
      return data.map((f) => f.appointment_id);
    },
    enabled: appointmentIds.length > 0 && !!user,
  });

  const feedbackSet = new Set(existingFeedback || []);
  const unfeedbackedAppointments = recentCompleted.filter(
    (a) => !feedbackSet.has(a.id) && !dismissed.has(a.id)
  );

  if (unfeedbackedAppointments.length === 0) return null;

  // Show just the most recent unfeedback'd one
  const appointment = unfeedbackedAppointments[0];

  return (
    <>
      <Card className="border-yellow-300/50 bg-gradient-to-r from-yellow-50/80 to-amber-50/50 dark:from-yellow-950/20 dark:to-amber-950/10 dark:border-yellow-800/30 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center shrink-0">
              <Star className="h-4.5 w-4.5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">How was your visit?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your appointment with{" "}
                <span className="font-medium text-foreground">
                  {formatDoctorName(appointment.doctor_profile?.full_name)}
                </span>{" "}
                on {format(parseISO(appointment.appointment_date), "MMM d")} — help others by sharing your experience.
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white"
                  onClick={() =>
                    setFeedbackTarget({
                      appointmentId: appointment.id,
                      doctorId: appointment.doctor_id,
                      doctorName: appointment.doctor_profile?.full_name || null,
                    })
                  }
                >
                  <Star className="h-3 w-3" />
                  Leave Feedback
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => setDismissed((prev) => new Set(prev).add(appointment.id))}
                >
                  Not now
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setDismissed((prev) => new Set(prev).add(appointment.id))}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {feedbackTarget && (
        <ConsultationFeedbackDialog
          open={!!feedbackTarget}
          onOpenChange={(open) => { if (!open) setFeedbackTarget(null); }}
          appointmentId={feedbackTarget.appointmentId}
          doctorId={feedbackTarget.doctorId}
          doctorName={feedbackTarget.doctorName}
        />
      )}
    </>
  );
}
