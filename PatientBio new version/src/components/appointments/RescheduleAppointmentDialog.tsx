import { useState } from "react";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { TimeSlotPicker } from "@/components/appointments/TimeSlotPicker";
import { Appointment, TimeSlot } from "@/types/hospital";
import { format, addDays } from "date-fns";
import { Loader2 } from "lucide-react";

interface RescheduleAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
  onReschedule: (date: string, startTime: string, endTime: string) => void;
  isRescheduling?: boolean;
}

export function RescheduleAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onReschedule,
  isRescheduling,
}: RescheduleAppointmentDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const handleReschedule = () => {
    if (!selectedDate || !selectedSlot) return;
    onReschedule(
      format(selectedDate, "yyyy-MM-dd"),
      selectedSlot.start_time,
      selectedSlot.end_time
    );
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Reschedule Appointment</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Patient</p>
            <p className="font-medium">{appointment.patient_profile?.display_name || "Unknown"}</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Select New Date</p>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedSlot(null);
              }}
              disabled={(date) => date < addDays(new Date(), 0)}
              className="rounded-md border pointer-events-auto"
            />
          </div>

          {selectedDate && (
            <div>
              <p className="text-sm font-medium mb-2">Select New Time</p>
              <TimeSlotPicker
                doctorId={appointment.doctor_id}
                hospitalId={appointment.hospital_id || undefined}
                date={selectedDate}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
              />
            </div>
          )}
        </div>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={!selectedDate || !selectedSlot || isRescheduling}
          >
            {isRescheduling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Reschedule
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
