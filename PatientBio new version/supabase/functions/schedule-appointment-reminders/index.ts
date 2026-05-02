import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get appointments in the next 48 hours that don't have reminders scheduled yet
    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        start_time,
        patient_id,
        status
      `)
      .gte("appointment_date", now.toISOString().split("T")[0])
      .lte("appointment_date", in48Hours.toISOString().split("T")[0])
      .in("status", ["scheduled", "confirmed"]);

    if (apptError) {
      throw new Error(`Failed to fetch appointments: ${apptError.message}`);
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No upcoming appointments to schedule reminders for" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let scheduled = 0;
    let skipped = 0;

    for (const appointment of appointments) {
      // Get patient's reminder preferences
      const { data: prefs } = await supabase
        .from("appointment_reminder_preferences")
        .select("email_enabled, sms_enabled, reminder_hours")
        .eq("user_id", appointment.patient_id)
        .single();

      // Default preferences if none set
      const emailEnabled = prefs?.email_enabled ?? true;
      const smsEnabled = prefs?.sms_enabled ?? false;
      const reminderHours = prefs?.reminder_hours ?? [24];

      if (!emailEnabled && !smsEnabled) {
        skipped++;
        continue;
      }

      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);

      for (const hours of reminderHours) {
        const scheduledFor = new Date(appointmentDateTime.getTime() - hours * 60 * 60 * 1000);
        
        // Skip if reminder time has already passed
        if (scheduledFor <= now) {
          continue;
        }

        // Check if reminders already exist for this appointment and timing
        const { data: existingReminders } = await supabase
          .from("appointment_reminders")
          .select("id")
          .eq("appointment_id", appointment.id)
          .eq("hours_before", hours);

        if (existingReminders && existingReminders.length > 0) {
          continue;
        }

        // Schedule email reminder
        if (emailEnabled) {
          await supabase.from("appointment_reminders").insert({
            appointment_id: appointment.id,
            reminder_type: "email",
            hours_before: hours,
            scheduled_for: scheduledFor.toISOString(),
            status: "pending",
          });
          scheduled++;
        }

        // Schedule SMS reminder
        if (smsEnabled) {
          await supabase.from("appointment_reminders").insert({
            appointment_id: appointment.id,
            reminder_type: "sms",
            hours_before: hours,
            scheduled_for: scheduledFor.toISOString(),
            status: "pending",
          });
          scheduled++;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scheduled ${scheduled} reminders, skipped ${skipped} appointments` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error scheduling reminders:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
