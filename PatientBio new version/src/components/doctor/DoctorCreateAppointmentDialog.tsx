import { useState, useEffect, useMemo } from "react";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { TimeSlotPicker } from "@/components/appointments/TimeSlotPicker";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGrantPatientAccess } from "@/hooks/useDoctorPatients";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, isBefore, startOfToday, addWeeks, addMonths } from "date-fns";
import { TimeSlot } from "@/types/hospital";
import { CalendarPlus, AlertTriangle, Loader2, LinkIcon, Repeat, Sparkles } from "lucide-react";
import { CostPreviewBadge } from "@/components/appointments/CostPreviewBadge";
import PatientLookupInput from "@/components/hospital/PatientLookupInput";
import { getSpecialtyConfig } from "@/constants/specialtyConfig";

interface DoctorCreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitalId?: string;
}

const APPOINTMENT_TYPES = [
  { value: "new_consultation", label: "New Consultation" },
  { value: "follow_up", label: "Follow-up" },
  { value: "urgent", label: "Urgent" },
  { value: "telemedicine", label: "Telemedicine" },
  { value: "walk_in", label: "Walk-in" },
];

const RECURRENCE_OPTIONS = [
  { value: "none", label: "No Repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

type ConnectionStatus = "idle" | "checking" | "connected" | "not_connected";

export function DoctorCreateAppointmentDialog({ open, onOpenChange, hospitalId }: DoctorCreateAppointmentDialogProps) {
  const { user } = useAuth();
  const { data: doctorProfile } = useDoctorProfile();
  const queryClient = useQueryClient();
  const grantAccess = useGrantPatientAccess();

  // Specialty-driven config
  const specialtyConfig = useMemo(
    () => getSpecialtyConfig(doctorProfile?.specialty),
    [doctorProfile?.specialty]
  );

  // Merge base appointment types with specialty-specific ones
  const allAppointmentTypes = useMemo(() => {
    const base = APPOINTMENT_TYPES;
    const extra = specialtyConfig.appointmentTypes || [];
    const baseValues = new Set(base.map(t => t.value));
    return [...base, ...extra.filter(t => !baseValues.has(t.value))];
  }, [specialtyConfig]);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [reason, setReason] = useState("");
  const [appointmentType, setAppointmentType] = useState("new_consultation");
  const [recurrencePattern, setRecurrencePattern] = useState("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(undefined);

  // Check connection whenever patient changes
  useEffect(() => {
    if (!selectedPatientId || !user?.id) {
      setConnectionStatus("idle");
      return;
    }

    let cancelled = false;
    setConnectionStatus("checking");

    supabase
      .from("doctor_patient_access")
      .select("id")
      .eq("doctor_id", user.id)
      .eq("patient_id", selectedPatientId)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Connection check error:", error);
          setConnectionStatus("not_connected");
          return;
        }
        setConnectionStatus(data ? "connected" : "not_connected");
      });

    return () => { cancelled = true; };
  }, [selectedPatientId, user?.id]);

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSelectedSlot(null);
  };

  const handleConnectPatient = () => {
    if (!user?.id || !selectedPatientId) return;
    grantAccess.mutate(
      { doctorId: user.id, patientId: selectedPatientId },
      {
        onSuccess: () => {
          setConnectionStatus("connected");
          toast.success("Patient connected successfully");
        },
        onError: (err: any) => {
          toast.error("Failed to connect patient: " + err.message);
        },
      }
    );
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedPatientId || !selectedDate || !selectedSlot) throw new Error("Missing fields");
      
      const baseRow = {
        patient_id: selectedPatientId,
        doctor_id: user.id,
        hospital_id: hospitalId || null,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        reason: reason || null,
        status: "confirmed" as const,
        appointment_type: appointmentType,
        recurrence_pattern: recurrencePattern !== "none" ? recurrencePattern : null,
        recurrence_end_date: recurrencePattern !== "none" && recurrenceEndDate ? format(recurrenceEndDate, "yyyy-MM-dd") : null,
      };

      const rows = [baseRow];

      if (recurrencePattern !== "none" && recurrenceEndDate) {
        let current = new Date(selectedDate);
        const endDate = recurrenceEndDate;
        const advanceFn =
          recurrencePattern === "weekly" ? (d: Date) => addWeeks(d, 1)
          : recurrencePattern === "biweekly" ? (d: Date) => addWeeks(d, 2)
          : (d: Date) => addMonths(d, 1);

        for (let i = 0; i < 52; i++) {
          current = advanceFn(current);
          if (current > endDate) break;
          rows.push({ ...baseRow, appointment_date: format(current, "yyyy-MM-dd") });
        }
      }

      const { error } = await supabase.from("appointments").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(count > 1 ? `${count} appointments created` : "Appointment created");

      if (selectedPatientId && selectedDate) {
        const msg = count > 1
          ? `Your doctor has scheduled ${count} recurring appointments starting ${format(selectedDate, "MMM d, yyyy")}.`
          : `Your doctor has scheduled an appointment for ${format(selectedDate, "MMM d, yyyy")}.`;
        supabase.from("notifications").insert({
          user_id: selectedPatientId,
          type: "appointment_booked",
          title: "Appointment Scheduled",
          message: msg,
        }).then(() => {});
      }

      onOpenChange(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error("Failed to create appointment: " + err.message);
    },
  });

  const resetForm = () => {
    setSelectedPatientId("");
    setConnectionStatus("idle");
    setSelectedSlot(null);
    setReason("");
    setAppointmentType("new_consultation");
    setRecurrencePattern("none");
    setRecurrenceEndDate(undefined);
  };

  const isConnected = connectionStatus === "connected";
  const isValid = selectedPatientId && isConnected && selectedDate && selectedSlot;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Create Appointment
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-4">
          {/* Patient Search by Health Passport ID */}
          <PatientLookupInput
            value={selectedPatientId}
            onChange={handlePatientChange}
            label="Search Patient by Health Passport ID"
            placeholder="e.g., PB-202602-000008-6"
            showRegisterOption={false}
          />

          {/* Connection status */}
          {connectionStatus === "checking" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connection status...
            </div>
          )}

          {connectionStatus === "not_connected" && selectedPatientId && (
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
              <CardContent className="py-3 space-y-3">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Patient not connected</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This patient is not connected to you yet. You must connect before creating an appointment.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConnectPatient}
                  disabled={grantAccess.isPending}
                  className="w-full"
                >
                  {grantAccess.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LinkIcon className="h-4 w-4 mr-2" />
                  )}
                  Connect Patient & Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Appointment Type - show after connected */}
          {isConnected && (
            <div className="space-y-2">
              <Label>Appointment Type</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allAppointmentTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CostPreviewBadge appointmentType={appointmentType} />
            </div>
          )}

          {/* Recurrence */}
          {isConnected && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5" />
                Repeat
              </Label>
              <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {recurrencePattern !== "none" && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Repeat Until</Label>
                  <Calendar
                    mode="single"
                    selected={recurrenceEndDate}
                    onSelect={setRecurrenceEndDate}
                    disabled={(date) => isBefore(date, selectedDate || startOfToday())}
                    className="rounded-md border pointer-events-auto"
                  />
                </div>
              )}
            </div>
          )}

          {/* Date */}
          {isConnected && (
            <div className="space-y-2">
              <Label>Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null); }}
                disabled={(date) => isBefore(date, startOfToday())}
                className="rounded-md border"
              />
            </div>
          )}

          {/* Time */}
          {isConnected && selectedDate && user?.id && (
            <div className="space-y-2">
              <Label>Time Slot</Label>
              <div className="border rounded-md p-4">
                <TimeSlotPicker
                  doctorId={user.id}
                  hospitalId={hospitalId}
                  date={selectedDate}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                />
              </div>
            </div>
          )}

          {/* Reason with specialty quick-reason chips */}
          {isConnected && selectedSlot && (
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              {specialtyConfig.visitReasons.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Quick reasons for {doctorProfile?.specialty || "your specialty"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {specialtyConfig.visitReasons.map((r) => (
                      <Badge
                        key={r}
                        variant={reason === r ? "default" : "outline"}
                        className="cursor-pointer text-xs px-2 py-1 hover:bg-accent transition-colors"
                        onClick={() => setReason(reason === r ? "" : r)}
                      >
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Walk-in consultation, phone call, etc."
                rows={2}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!isValid || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Appointment"}
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
