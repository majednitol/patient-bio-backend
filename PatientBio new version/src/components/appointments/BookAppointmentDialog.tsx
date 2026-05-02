import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimeSlotPicker } from "./TimeSlotPicker";
import { SmartBookingAdvisor } from "./SmartBookingAdvisor";
import { SmartDoctorMatcher } from "./SmartDoctorMatcher";
import { useSlotRecommendations } from "@/hooks/useSlotRecommendations";
import { CostComparisonBadge } from "@/components/dashboard/CostComparisonBadge";
import { useAppointments } from "@/hooks/useAppointments";
import { useBookableDoctors, BookableDoctor } from "@/hooks/useBookableDoctors";
import { TimeSlot } from "@/types/hospital";
import { format, addDays, addWeeks, addMonths, isBefore, startOfToday } from "date-fns";
import { Stethoscope, CalendarDays, Clock, CheckCircle, Building2, Loader2, UserPlus, Repeat, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedDoctorId?: string;
  initialSymptoms?: string;
}

export function BookAppointmentDialog({
  open,
  onOpenChange,
  preselectedDoctorId,
  initialSymptoms,
}: BookAppointmentDialogProps) {
  const [selectedDoctor, setSelectedDoctor] = useState<BookableDoctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [reason, setReason] = useState(initialSymptoms || "");
  const [recurrencePattern, setRecurrencePattern] = useState<string>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(undefined);

  const { data: doctors, isLoading: loadingDoctors } = useBookableDoctors();
  const { createAppointment } = useAppointments();

  // Auto-select preselected doctor when prop or doctors list changes
  useEffect(() => {
    if (preselectedDoctorId && doctors?.length) {
      const doc = doctors.find((d) => d.id === preselectedDoctorId);
      if (doc) setSelectedDoctor(doc);
    }
  }, [preselectedDoctorId, doctors]);

  const handleBook = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;

    await createAppointment.mutateAsync({
      doctor_id: selectedDoctor.id,
      hospital_id: selectedDoctor.hospital_id || undefined,
      appointment_date: format(selectedDate, "yyyy-MM-dd"),
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      reason: reason || undefined,
      recurrence_pattern: recurrencePattern !== "none" ? recurrencePattern : undefined,
      recurrence_end_date: recurrencePattern !== "none" && recurrenceEndDate
        ? format(recurrenceEndDate, "yyyy-MM-dd")
        : undefined,
    });

    // Reset form
    setSelectedDoctor(null);
    setSelectedSlot(null);
    setReason("");
    onOpenChange(false);
  };

  const handleDoctorSelect = (doctor: BookableDoctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
  };

  const isFormValid = selectedDoctor && selectedDate && selectedSlot;
  
  const connectedDoctors = doctors?.filter((d) => d.connection_type === "granted_access") || [];
  const otherDoctors = doctors?.filter((d) => d.connection_type !== "granted_access") || [];

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Book Appointment
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-6">
          {/* Doctor Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Select Doctor
            </Label>
            
            {loadingDoctors ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : doctors?.length === 0 ? (
              <div className="text-center py-8 border rounded-lg bg-muted/30">
                <UserPlus className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">No doctors available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect with a doctor using their QR code to book appointments
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Smart Doctor Matcher */}
                <SmartDoctorMatcher
                  doctors={doctors || []}
                  onSelectDoctor={handleDoctorSelect}
                  initialSymptoms={initialSymptoms}
                />

                {/* My Doctors (Connected) */}
                {connectedDoctors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3 text-primary" />
                      My Connected Doctors
                    </p>
                    <div className="grid gap-2">
                      {connectedDoctors.map((doctor) => (
                        <DoctorCard
                          key={doctor.id}
                          doctor={doctor}
                          isSelected={selectedDoctor?.id === doctor.id}
                          onSelect={() => handleDoctorSelect(doctor)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Available Doctors */}
                {otherDoctors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" />
                      Other Available Doctors
                    </p>
                    <div className="grid gap-2">
                      {otherDoctors.map((doctor) => (
                        <DoctorCard
                          key={doctor.id}
                          doctor={doctor}
                          isSelected={selectedDoctor?.id === doctor.id}
                          onSelect={() => handleDoctorSelect(doctor)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date and Time Selection */}
          {selectedDoctor && (
            <div className="space-y-4">
              {/* Smart Booking Advisor */}
              <SmartBookingAdvisor
                doctorId={selectedDoctor.id}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                }}
              />

              <div className="grid md:grid-cols-2 gap-6">
                {/* Calendar */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Select Date
                  </Label>
                  <BookingCalendarWithLoad
                    doctorId={selectedDoctor.id}
                    selectedDate={selectedDate}
                    onSelectDate={(date) => {
                      setSelectedDate(date);
                      setSelectedSlot(null);
                    }}
                  />
                </div>

              {/* Time Slots */}
              {selectedDate && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Available Times for {format(selectedDate, "MMM d")}
                  </Label>
                  <div className="border rounded-md p-4 min-h-[200px]">
                    <TimeSlotPicker
                      doctorId={selectedDoctor.id}
                      hospitalId={selectedDoctor.hospital_id || undefined}
                      date={selectedDate}
                      selectedSlot={selectedSlot}
                      onSelectSlot={setSelectedSlot}
                    />
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {/* Reason */}
          {selectedSlot && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reason for Visit (Optional)</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly describe the reason for your appointment..."
                  rows={3}
                />
              </div>

              {/* Recurring Appointment */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Repeat Appointment (Optional)
                </Label>
                <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                  <SelectTrigger>
                    <SelectValue placeholder="No repeat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No repeat</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                {recurrencePattern !== "none" && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Repeat until</Label>
                    <Calendar
                      mode="single"
                      selected={recurrenceEndDate}
                      onSelect={setRecurrenceEndDate}
                      disabled={(date) => !selectedDate || isBefore(date, selectedDate)}
                      className="rounded-md border"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBook}
              disabled={!isFormValid || createAppointment.isPending}
            >
              {createAppointment.isPending ? "Booking..." : "Book Appointment"}
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

// Doctor selection card component
interface DoctorCardProps {
  doctor: BookableDoctor;
  isSelected: boolean;
  onSelect: () => void;
}

function DoctorCard({ doctor, isSelected, onSelect }: DoctorCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!doctor.has_availability}
      className={cn(
        "flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg border transition-all text-left w-full",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : doctor.has_availability
          ? "border-border hover:border-primary/50 hover:bg-muted/50"
          : "border-border/50 opacity-50 cursor-not-allowed"
      )}
    >
      <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border shrink-0">
        <AvatarImage src={doctor.avatar_url || undefined} alt={doctor.full_name} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
          {doctor.full_name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="font-medium text-sm sm:text-base truncate max-w-[140px] sm:max-w-none">{doctor.full_name}</span>
          <Link to={`/dashboard/doctor/${doctor.id}`} className="text-[10px] text-primary hover:underline shrink-0">View Profile</Link>
          {doctor.connection_type === "granted_access" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary shrink-0">
              Connected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
          {doctor.specialty && <span className="truncate">{doctor.specialty}</span>}
          {doctor.experience_years != null && (
            <>
              <span>•</span>
              <span>{doctor.experience_years} yrs</span>
            </>
          )}
          {doctor.hospital_name && (
            <>
              <span>•</span>
              <span className="truncate">{doctor.hospital_name}</span>
            </>
          )}
          <CostComparisonBadge doctorId={doctor.id} specialty={doctor.specialty} />
        </div>
        {/* Practice type & disease tags */}
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {(doctor.practice_type === "private" || doctor.practice_type === "both") && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5 border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950">
              <Briefcase className="h-2.5 w-2.5" />
              Private
            </Badge>
          )}
          {(doctor.practice_type === "hospital" || doctor.practice_type === "both") && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5 border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950">
              <Building2 className="h-2.5 w-2.5" />
              Hospital
            </Badge>
          )}
          {doctor.diseases_treated?.slice(0, 2).map((d) => (
            <Badge key={d} variant="secondary" className="text-[9px] px-1 py-0">
              {d}
            </Badge>
          ))}
          {(doctor.diseases_treated?.length || 0) > 2 && (
            <span className="text-[9px] text-muted-foreground">+{(doctor.diseases_treated?.length || 0) - 2}</span>
          )}
        </div>
      </div>
      {!doctor.has_availability && (
        <Badge variant="outline" className="text-[10px] shrink-0 whitespace-nowrap">
          No avail.
        </Badge>
      )}
      {isSelected && doctor.has_availability && (
        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
      )}
    </button>
  );
}

// Calendar with load indicators for smart booking
function BookingCalendarWithLoad({
  doctorId,
  selectedDate,
  onSelectDate,
}: {
  doctorId: string;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
}) {
  const { data: slotData } = useSlotRecommendations(doctorId);

  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={onSelectDate}
      disabled={(date) => isBefore(date, startOfToday())}
      className="rounded-md border"
      modifiers={slotData?.recommendations ? {
        low: slotData.recommendations
          .filter((r) => r.load === "low")
          .map((r) => new Date(r.date)),
        high: slotData.recommendations
          .filter((r) => r.load === "high")
          .map((r) => new Date(r.date)),
        suggested: (slotData.suggested || []).map((d) => new Date(d)),
      } : undefined}
      modifiersStyles={{
        low: { backgroundColor: "hsl(142 76% 36% / 0.15)", borderRadius: "50%" },
        high: { backgroundColor: "hsl(0 84% 60% / 0.15)", borderRadius: "50%" },
        suggested: { boxShadow: "inset 0 0 0 2px hsl(142 76% 36% / 0.4)", borderRadius: "50%" },
      }}
    />
  );
}
