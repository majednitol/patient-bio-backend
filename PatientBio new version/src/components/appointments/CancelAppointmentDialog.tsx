import { formatDoctorName } from "@/utils/formatDoctorName";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Appointment } from "@/types/hospital";
import { format, parseISO } from "date-fns";

interface CancelAppointmentDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => void;
}

export function CancelAppointmentDialog({
  appointment,
  open,
  onOpenChange,
  onConfirm,
}: CancelAppointmentDialogProps) {
  if (!appointment) return null;

  const appointmentDate = parseISO(appointment.appointment_date);
  const formattedDate = format(appointmentDate, "EEEE, MMMM d, yyyy");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel your appointment with{" "}
            <span className="font-semibold text-foreground">
              {formatDoctorName(appointment.doctor_profile?.full_name, "your doctor")}
            </span>{" "}
            on {formattedDate} at {appointment.start_time.substring(0, 5)}?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(appointment.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Cancel Appointment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
