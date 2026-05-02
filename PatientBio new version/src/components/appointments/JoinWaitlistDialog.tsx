import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppointmentWaitlist } from "@/hooks/useAppointmentWaitlist";
import { useBookableDoctors } from "@/hooks/useBookableDoctors";
import { format, addDays, isBefore, startOfToday } from "date-fns";
import { Clock, CalendarDays, Bell, Stethoscope } from "lucide-react";

interface JoinWaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId?: string;
  doctorName?: string;
  preselectedDate?: Date;
}

const TIME_OPTIONS = [
  { value: "any", label: "Any time" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
];

export function JoinWaitlistDialog({
  open,
  onOpenChange,
  doctorId: initialDoctorId,
  doctorName: initialDoctorName,
  preselectedDate,
}: JoinWaitlistDialogProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId || "");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    preselectedDate || addDays(new Date(), 1)
  );
  const [timeStart, setTimeStart] = useState("any");
  const [timeEnd, setTimeEnd] = useState("any");
  const [reason, setReason] = useState("");

  const { joinWaitlist } = useAppointmentWaitlist();
  const { data: doctors } = useBookableDoctors();

  const handleSubmit = async () => {
    if (!selectedDate || !selectedDoctorId) return;

    await joinWaitlist.mutateAsync({
      doctor_id: selectedDoctorId,
      preferred_date: format(selectedDate, "yyyy-MM-dd"),
      preferred_time_start: timeStart !== "any" ? timeStart : undefined,
      preferred_time_end: timeEnd !== "any" ? timeEnd : undefined,
      reason: reason || undefined,
    });

    setReason("");
    setTimeStart("any");
    setTimeEnd("any");
    onOpenChange(false);
  };

  const selectedDoctor = doctors?.find(d => d.id === selectedDoctorId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Join Waitlist
          </DialogTitle>
          <DialogDescription>
            Get notified when a slot opens up{selectedDoctor ? ` with Dr. ${selectedDoctor.full_name}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Doctor
            </Label>
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors?.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    Dr. {doc.full_name}{doc.specialty ? ` (${doc.specialty})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Preferred Date
            </Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => isBefore(date, startOfToday())}
              className="rounded-md border"
            />
          </div>

          {/* Time Preference */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5" />
                From
              </Label>
              <Select value={timeStart} onValueChange={setTimeStart}>
                <SelectTrigger>
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={`start-${t.value}`} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5" />
                To
              </Label>
              <Select value={timeEnd} onValueChange={setTimeEnd}>
                <SelectTrigger>
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={`end-${t.value}`} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason (Optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need this appointment?"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedDate || !selectedDoctorId || joinWaitlist.isPending}
            >
              {joinWaitlist.isPending ? "Joining..." : "Join Waitlist"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
