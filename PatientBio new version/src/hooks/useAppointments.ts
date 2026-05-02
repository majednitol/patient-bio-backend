import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { Appointment, AppointmentStatus } from "@/types/hospital";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { hospitalNotifications } from "@/hooks/useHospitalNotifications";
import { format } from "date-fns";
import { scheduleAppointmentReminders, cancelAppointmentReminders } from "@/utils/scheduleAppointmentReminders";
import { notifyWaitlistedPatients } from "@/hooks/useAppointmentWaitlist";
import { getCachedAppointments, cacheAppointments } from "@/lib/offlineDB";

interface UseAppointmentsOptions {
  hospitalId?: string;
  doctorId?: string;
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAppointments(options: UseAppointmentsOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { hospitalId, doctorId, patientId, dateFrom, dateTo } = options;

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", hospitalId, doctorId, patientId, dateFrom, dateTo],
    queryFn: async () => {
      try {
        let query = supabase
          .from("appointments")
          .select(`
            id, doctor_id, patient_id, hospital_id, appointment_date, start_time, end_time, status, reason, notes, created_at, cancelled_at, cancelled_by, checked_in_at, consultation_started_at, consultation_ended_at, parent_appointment_id, recurrence_pattern, recurrence_end_date, appointment_type,
            doctor_profile:doctor_profiles!appointments_doctor_id_fkey(
              full_name,
              specialty,
              avatar_url
            ),
            patient_profile:user_profiles!appointments_patient_id_fkey(
              display_name,
              phone,
              avatar_url
            ),
            hospital:hospitals(
              id,
              name
            )
          `);

        if (hospitalId) {
          query = query.eq("hospital_id", hospitalId);
        }
        if (doctorId) {
          query = query.eq("doctor_id", doctorId);
        }
        if (patientId) {
          query = query.eq("patient_id", patientId);
        }
        if (dateFrom) {
          query = query.gte("appointment_date", dateFrom);
        }
        if (dateTo) {
          query = query.lte("appointment_date", dateTo);
        }

        const { data, error } = await query
          .order("appointment_date")
          .order("start_time")
          .limit(200);
        
        if (error) throw error;

        // Cache patient appointments for offline use
        if (patientId && data && data.length > 0) {
          cacheAppointments(patientId, data.map((a: any) => ({
            ...a,
            doctor_profile: Array.isArray(a.doctor_profile) ? a.doctor_profile[0] : a.doctor_profile,
          }))).catch(() => {});
        }

        return data as unknown as Appointment[];
      } catch (err) {
        // Offline fallback for patient appointments only
        if (!navigator.onLine && patientId) {
          const cached = await getCachedAppointments(patientId);
          if (cached.length > 0) {
            return cached.map(c => ({
              id: c.id,
              patient_id: patientId,
              doctor_id: "",
              hospital_id: null,
              appointment_date: c.appointmentDate,
              start_time: c.startTime,
              end_time: c.endTime,
              status: c.status || "scheduled",
              reason: c.reason,
              notes: null,
              created_at: c.cachedAt,
              cancelled_at: null,
              cancelled_by: null,
              checked_in_at: null,
              consultation_started_at: null,
              consultation_ended_at: null,
              parent_appointment_id: null,
              recurrence_pattern: null,
              recurrence_end_date: null,
              appointment_type: null,
              doctor_profile: {
                full_name: c.doctorName,
                specialty: c.doctorSpecialty,
                avatar_url: null,
              },
              patient_profile: null,
              hospital: c.hospitalName ? { id: "", name: c.hospitalName } : null,
            })) as unknown as Appointment[];
          }
        }
        throw err;
      }
    },
    enabled: !!user,
    staleTime: STALE_TIMES.SHORT,
    retry: navigator.onLine ? 3 : 0,
  });

  const createAppointment = useMutation({
    mutationFn: async (appointment: {
      doctor_id: string;
      hospital_id?: string;
      appointment_date: string;
      start_time: string;
      end_time: string;
      reason?: string;
      recurrence_pattern?: string;
      recurrence_end_date?: string;
      appointment_type?: string;
      parent_appointment_id?: string;
    }) => {
      const baseRow = {
        patient_id: user?.id,
        doctor_id: appointment.doctor_id,
        hospital_id: appointment.hospital_id || null,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        reason: appointment.reason,
        status: "scheduled" as const,
        recurrence_pattern: appointment.recurrence_pattern && appointment.recurrence_pattern !== "none" ? appointment.recurrence_pattern : null,
        recurrence_end_date: appointment.recurrence_end_date || null,
        appointment_type: appointment.appointment_type || "new_consultation",
        parent_appointment_id: appointment.parent_appointment_id || null,
      };

      // If recurring, generate all occurrences
      const rows = [baseRow];
      if (baseRow.recurrence_pattern && appointment.recurrence_end_date) {
        const { addWeeks, addMonths } = await import("date-fns");
        let current = new Date(appointment.appointment_date);
        const endDate = new Date(appointment.recurrence_end_date);
        const advanceFn =
          baseRow.recurrence_pattern === "weekly" ? (d: Date) => addWeeks(d, 1)
          : baseRow.recurrence_pattern === "biweekly" ? (d: Date) => addWeeks(d, 2)
          : (d: Date) => addMonths(d, 1);

        // Generate up to 52 recurring instances
        for (let i = 0; i < 52; i++) {
          current = advanceFn(current);
          if (current > endDate) break;
          rows.push({
            ...baseRow,
            appointment_date: current.toISOString().split("T")[0],
          });
        }
      }

      const { data, error } = await supabase
        .from("appointments")
        .insert(rows)
        .select(`
          *,
          doctor_profile:doctor_profiles!appointments_doctor_id_fkey(full_name),
          patient_profile:user_profiles!appointments_patient_id_fkey(display_name)
        `);

      if (error) throw error;
      // Return first row for notification purposes
      return data?.[0] || null;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment booked successfully");

      // Unlock the PWA install banner after a successful booking
      try { const { markInstallEligibleAfterBooking } = await import("@/hooks/useSmartInstallTrigger"); markInstallEligibleAfterBooking(); } catch {}
      
      
      const aptData = data as any;
      const patientName = aptData?.patient_profile?.display_name || "A patient";
      const doctorName = aptData?.doctor_profile?.full_name || "a doctor";
      const dateStr = format(new Date(aptData.appointment_date), "MMM d, yyyy");

      // Notify the doctor directly about the new booking
      if (aptData?.doctor_id) {
        supabase.from("notifications").insert({
          user_id: aptData.doctor_id,
          type: "appointment_booked",
          title: "New Appointment Booked",
          message: `${patientName} booked an appointment on ${dateStr}`,
        }).then(({ error }) => {
          if (error) console.error("Failed to notify doctor:", error);
        });
      }

      // Also notify hospital staff if applicable
      if (aptData?.hospital_id) {
        hospitalNotifications.appointment(
          aptData.hospital_id,
          patientName,
          doctorName,
          dateStr,
          user?.id
        );
      }

      // Immediately schedule appointment reminders based on patient preferences
      if (aptData?.id && user?.id) {
        scheduleAppointmentReminders(
          aptData.id,
          user.id,
          aptData.appointment_date,
          aptData.start_time
        );
      }
    },
    onError: (error) => {
      toast.error("Failed to book appointment: " + error.message);
    },
  });

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: AppointmentStatus; notes?: string }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      if (status === "cancelled") {
        updateData.cancelled_by = user?.id;
        updateData.cancelled_at = new Date().toISOString();
        // Cancel all pending reminders for this appointment
        cancelAppointmentReminders(id);
      }

      const { data, error } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment updated");

      // Notify the patient about the status change
      const apt = data as any;
      if (apt?.patient_id && apt.patient_id !== user?.id) {
        const statusMessages: Record<string, { type: string; title: string; message: string }> = {
          confirmed: {
            type: "appointment_confirmed",
            title: "Appointment Confirmed",
            message: `Your appointment on ${format(new Date(apt.appointment_date), "MMM d, yyyy")} has been confirmed.`,
          },
          cancelled: {
            type: "appointment_cancelled",
            title: "Appointment Cancelled",
            message: `Your appointment on ${format(new Date(apt.appointment_date), "MMM d, yyyy")} has been cancelled.`,
          },
          completed: {
            type: "appointment_completed",
            title: "Appointment Completed",
            message: `Your appointment on ${format(new Date(apt.appointment_date), "MMM d, yyyy")} has been marked as completed.`,
          },
        };

        const info = statusMessages[variables.status];
        if (info) {
          supabase.from("notifications").insert({
            user_id: apt.patient_id,
            type: info.type,
            title: info.title,
            message: info.message,
          }).then(({ error }) => {
            if (error) console.error("Failed to notify patient:", error);
          });
        }
      }

      // Also notify the doctor when a patient cancels
      if (apt?.doctor_id && apt.doctor_id !== user?.id && variables.status === "cancelled") {
        supabase.from("notifications").insert({
          user_id: apt.doctor_id,
          type: "appointment_cancelled",
          title: "Appointment Cancelled",
          message: `A patient cancelled their appointment on ${format(new Date(apt.appointment_date), "MMM d, yyyy")}.`,
        }).then(({ error }) => {
          if (error) console.error("Failed to notify doctor:", error);
        });
      }

      // Notify waitlisted patients when a slot opens up
      if (variables.status === "cancelled" && apt?.doctor_id && apt?.appointment_date && apt?.start_time) {
        notifyWaitlistedPatients(
          apt.doctor_id,
          apt.appointment_date,
          apt.start_time,
          apt.end_time
        );
      }
    },
    onError: (error) => {
      toast.error("Failed to update appointment: " + error.message);
    },
  });

  const cancelAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("appointments")
        .update({
          status: "cancelled",
          cancelled_by: user?.id,
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment cancelled");

      // Cancel pending reminders
      if (data?.id) {
        cancelAppointmentReminders(data.id);
      }

      // Notify waitlisted patients
      const apt = data as any;
      if (apt?.doctor_id && apt?.appointment_date && apt?.start_time) {
        notifyWaitlistedPatients(apt.doctor_id, apt.appointment_date, apt.start_time, apt.end_time);
      }
    },
    onError: (error) => {
      toast.error("Failed to cancel appointment: " + error.message);
    },
  });

  const rescheduleAppointment = useMutation({
    mutationFn: async ({ id, appointment_date, start_time, end_time }: { id: string; appointment_date: string; start_time: string; end_time: string }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update({ appointment_date, start_time, end_time })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment rescheduled");

      // Notify the patient about the reschedule
      const apt = data as any;
      if (apt?.patient_id && apt.patient_id !== user?.id) {
        const newDate = format(new Date(variables.appointment_date), "MMM d, yyyy");
        supabase.from("notifications").insert({
          user_id: apt.patient_id,
          type: "appointment_rescheduled",
          title: "Appointment Rescheduled",
          message: `Your appointment has been rescheduled to ${newDate} at ${variables.start_time}.`,
        }).then(({ error }) => {
          if (error) console.error("Failed to notify patient:", error);
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to reschedule: " + error.message);
    },
  });

  const updateAppointmentNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ notes })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Note saved");
    },
    onError: (error) => {
      toast.error("Failed to save note: " + error.message);
    },
  });

  return {
    appointments: appointmentsQuery.data || [],
    isLoading: appointmentsQuery.isLoading,
    error: appointmentsQuery.error,
    createAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    rescheduleAppointment,
    updateAppointmentNotes,
  };
}

// Hook for patient's own appointments
export function useMyAppointments() {
  const { user } = useAuth();
  return useAppointments({ patientId: user?.id });
}

// Hook for doctor's appointments
export function useDoctorAppointments(hospitalId?: string, doctorIdOverride?: string) {
  const { user } = useAuth();
  return useAppointments({ doctorId: doctorIdOverride || user?.id, hospitalId });
}

// Hook for hospital appointments (all doctors)
export function useHospitalAppointments(hospitalId: string) {
  return useAppointments({ hospitalId });
}
