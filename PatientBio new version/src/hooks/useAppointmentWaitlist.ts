import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface WaitlistEntry {
  id: string;
  patient_id: string;
  doctor_id: string;
  preferred_date: string;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  reason: string | null;
  status: string;
  notified_at: string | null;
  available_appointment_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useAppointmentWaitlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const waitlistQuery = useQuery({
    queryKey: ["appointment-waitlist", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_waitlist")
        .select("id, patient_id, doctor_id, preferred_date, preferred_time_start, preferred_time_end, reason, status, notified_at, available_appointment_id, created_at, updated_at")
        .eq("patient_id", user!.id)
        .in("status", ["waiting", "notified"])
        .order("preferred_date", { ascending: true });

      if (error) throw error;
      return data as WaitlistEntry[];
    },
    enabled: !!user,
  });

  const joinWaitlist = useMutation({
    mutationFn: async (entry: {
      doctor_id: string;
      preferred_date: string;
      preferred_time_start?: string;
      preferred_time_end?: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from("appointment_waitlist")
        .insert({
          patient_id: user!.id,
          doctor_id: entry.doctor_id,
          preferred_date: entry.preferred_date,
          preferred_time_start: entry.preferred_time_start || null,
          preferred_time_end: entry.preferred_time_end || null,
          reason: entry.reason || null,
          status: "waiting",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist"] });
      toast.success("Added to waitlist! You'll be notified when a slot opens up.");
    },
    onError: (error) => {
      toast.error("Failed to join waitlist: " + error.message);
    },
  });

  const cancelWaitlistEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointment_waitlist")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-waitlist"] });
      toast.success("Removed from waitlist");
    },
    onError: (error) => {
      toast.error("Failed to update waitlist: " + error.message);
    },
  });

  return {
    waitlistEntries: waitlistQuery.data || [],
    isLoading: waitlistQuery.isLoading,
    joinWaitlist,
    cancelWaitlistEntry,
  };
}

/**
 * Notify waitlisted patients when an appointment slot becomes available.
 * Called from useAppointments when an appointment is cancelled.
 */
export async function notifyWaitlistedPatients(
  doctorId: string,
  appointmentDate: string,
  startTime: string,
  endTime: string
) {
  try {
    // Find matching waitlist entries
    const { data: entries, error } = await supabase
      .from("appointment_waitlist")
      .select("id, patient_id, doctor_id, preferred_date, preferred_time_start, preferred_time_end, reason, status, notified_at, available_appointment_id, created_at, updated_at")
      .eq("doctor_id", doctorId)
      .eq("preferred_date", appointmentDate)
      .eq("status", "waiting");

    if (error || !entries || entries.length === 0) return;

    // Filter by time preference if set
    const matching = entries.filter((entry) => {
      if (!entry.preferred_time_start && !entry.preferred_time_end) return true;
      if (entry.preferred_time_start && startTime < entry.preferred_time_start) return false;
      if (entry.preferred_time_end && startTime > entry.preferred_time_end) return false;
      return true;
    });

    if (matching.length === 0) return;

    // Get doctor name for notification
    const { data: doctor } = await supabase
      .from("doctor_profiles")
      .select("full_name")
      .eq("user_id", doctorId)
      .single();

    const doctorName = doctor?.full_name || "your doctor";

    // Notify each matching patient and update waitlist status
    for (const entry of matching) {
      // Create in-app notification
      await supabase.from("notifications").insert({
        user_id: entry.patient_id,
        type: "waitlist_available",
        title: "Appointment Slot Available!",
        message: `A slot opened up with Dr. ${doctorName} on ${appointmentDate} at ${startTime}. Book now before it's taken!`,
      });

      // Update waitlist entry status
      await supabase
        .from("appointment_waitlist")
        .update({ status: "notified", notified_at: new Date().toISOString() })
        .eq("id", entry.id);
    }
  } catch (err) {
    console.error("Error notifying waitlisted patients:", err);
  }
}
