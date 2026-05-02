import { supabase } from "@/integrations/supabase/client";

/**
 * Immediately schedule appointment reminders after booking.
 * Reads patient's reminder preferences and inserts rows into appointment_reminders.
 */
export async function scheduleAppointmentReminders(
  appointmentId: string,
  patientId: string,
  appointmentDate: string,
  startTime: string
) {
  try {
    // Get patient's reminder preferences
    const { data: prefs } = await supabase
      .from("appointment_reminder_preferences")
      .select("*")
      .eq("user_id", patientId)
      .maybeSingle();

    const emailEnabled = prefs?.email_enabled ?? true;
    const smsEnabled = prefs?.sms_enabled ?? false;
    const reminderHours: number[] = prefs?.reminder_hours ?? [24];

    if (!emailEnabled && !smsEnabled) {
      // Still schedule in-app reminders even if email/sms disabled
      const appointmentDateTime = new Date(`${appointmentDate}T${startTime}`);
      const now = new Date();

      const reminders = reminderHours
        .map((hours) => {
          const scheduledFor = new Date(appointmentDateTime.getTime() - hours * 60 * 60 * 1000);
          if (scheduledFor <= now) return null;
          return {
            appointment_id: appointmentId,
            reminder_type: "in_app",
            hours_before: hours,
            scheduled_for: scheduledFor.toISOString(),
            status: "pending",
          };
        })
        .filter(Boolean);

      if (reminders.length > 0) {
        await supabase.from("appointment_reminders").insert(reminders);
      }
      return;
    }

    const appointmentDateTime = new Date(`${appointmentDate}T${startTime}`);
    const now = new Date();
    const reminders: Array<{
      appointment_id: string;
      reminder_type: string;
      hours_before: number;
      scheduled_for: string;
      status: string;
    }> = [];

    for (const hours of reminderHours) {
      const scheduledFor = new Date(appointmentDateTime.getTime() - hours * 60 * 60 * 1000);
      if (scheduledFor <= now) continue;

      if (emailEnabled) {
        reminders.push({
          appointment_id: appointmentId,
          reminder_type: "email",
          hours_before: hours,
          scheduled_for: scheduledFor.toISOString(),
          status: "pending",
        });
      }

      if (smsEnabled) {
        reminders.push({
          appointment_id: appointmentId,
          reminder_type: "sms",
          hours_before: hours,
          scheduled_for: scheduledFor.toISOString(),
          status: "pending",
        });
      }
    }

    if (reminders.length > 0) {
      const { error } = await supabase.from("appointment_reminders").insert(reminders);
      if (error) console.error("Failed to schedule reminders:", error);
    }
  } catch (err) {
    console.error("Error scheduling appointment reminders:", err);
  }
}

/**
 * Cancel all pending reminders for an appointment.
 */
export async function cancelAppointmentReminders(appointmentId: string) {
  try {
    const { error } = await supabase
      .from("appointment_reminders")
      .update({ status: "cancelled", error_message: "Appointment was cancelled" })
      .eq("appointment_id", appointmentId)
      .eq("status", "pending");

    if (error) console.error("Failed to cancel reminders:", error);
  } catch (err) {
    console.error("Error cancelling appointment reminders:", err);
  }
}
