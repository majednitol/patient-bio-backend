import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushToUser } from "../_shared/push-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AppointmentDetails {
  id: string;
  appointment_date: string;
  start_time: string;
  reason: string | null;
  patient_id: string;
  doctor_id: string;
  hospital_id: string | null;
  patient_profile: { display_name: string | null; phone: string | null } | null;
  doctor_profile: { full_name: string } | null;
  hospital: { name: string } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    const { data: pendingReminders, error: remindersError } = await supabase
      .from("appointment_reminders")
      .select("id, appointment_id, reminder_type, hours_before, scheduled_for")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(50);

    if (remindersError) throw new Error(`Failed to fetch reminders: ${remindersError.message}`);

    if (!pendingReminders || pendingReminders.length === 0) {
      return new Response(JSON.stringify({ message: "No pending reminders to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results = { processed: 0, sent: 0, failed: 0, skipped: 0, errors: [] as string[] };

    for (const reminder of pendingReminders) {
      results.processed++;

      const { data: appointment, error: apptError } = await supabase
        .from("appointments")
        .select(`id, appointment_date, start_time, reason, patient_id, doctor_id, hospital_id,
          patient_profile:user_profiles!appointments_patient_id_fkey(display_name, phone),
          doctor_profile:doctor_profiles!appointments_doctor_id_fkey(full_name),
          hospital:hospitals(name)`)
        .eq("id", reminder.appointment_id)
        .single();

      if (apptError || !appointment) {
        await supabase.from("appointment_reminders").update({ status: "failed", error_message: "Appointment not found" }).eq("id", reminder.id);
        results.failed++;
        continue;
      }

      const appt = appointment as unknown as AppointmentDetails;

      const { data: apptStatus } = await supabase.from("appointments").select("status").eq("id", reminder.appointment_id).single();
      if (apptStatus?.status === "cancelled") {
        await supabase.from("appointment_reminders").update({ status: "cancelled", error_message: "Appointment was cancelled" }).eq("id", reminder.id);
        results.skipped++;
        continue;
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(appt.patient_id);
      const patientEmail = authUser?.user?.email;
      const patientName = appt.patient_profile?.display_name || "Patient";
      const doctorName = appt.doctor_profile?.full_name || "Doctor";
      const hospitalName = appt.hospital?.name || "";

      const appointmentDate = new Date(`${appt.appointment_date}T${appt.start_time}`);
      const formattedDate = appointmentDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const formattedTime = appointmentDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

      try {
        if (reminder.reminder_type === "email" && resendApiKey && patientEmail) {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
            body: JSON.stringify({
              from: "Patient Bio <noreply@resend.dev>",
              to: patientEmail,
              subject: `Appointment Reminder: ${formattedDate} at ${formattedTime}`,
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <h2 style="color:#7c3aed">Appointment Reminder</h2>
                <p>Hello ${patientName},</p>
                <p>This is a reminder for your upcoming appointment:</p>
                <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0">
                  <p><strong>Date:</strong> ${formattedDate}</p><p><strong>Time:</strong> ${formattedTime}</p>
                  <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
                  ${hospitalName ? `<p><strong>Location:</strong> ${hospitalName}</p>` : ""}
                </div>
                <p>Please arrive 10-15 minutes early.</p>
                <p>Best regards,<br>Patient Bio Team</p></div>`,
            }),
          });
          if (!emailResponse.ok) throw new Error(`Resend: ${await emailResponse.text()}`);
          await supabase.from("appointment_reminders").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", reminder.id);
          results.sent++;
        } else {
          const reason = reminder.reminder_type === "email"
            ? (!resendApiKey ? "RESEND_API_KEY not configured" : "No patient email")
            : "SMS not configured";
          await supabase.from("appointment_reminders").update({ status: "failed", error_message: reason }).eq("id", reminder.id);
          results.skipped++;
        }

        // In-app notification
        await supabase.from("notifications").insert({
          user_id: appt.patient_id, type: "appointment_reminder", title: "Upcoming Appointment Reminder",
          message: `Reminder: You have an appointment with Dr. ${doctorName} on ${formattedDate} at ${formattedTime}${hospitalName ? ` at ${hospitalName}` : ""}.`,
        }).catch((e: Error) => console.error("Notification insert error:", e));

        // Push notification via shared utility
        await sendPushToUser(supabase, appt.patient_id, {
          title: "📅 Appointment Reminder",
          body: `Appointment with Dr. ${doctorName} on ${formattedDate} at ${formattedTime}${hospitalName ? ` at ${hospitalName}` : ""}.`,
          icon: "/pwa-192x192.png", badge: "/pwa-maskable-192x192.png",
          data: { type: "appointment_reminder", appointment_id: appt.id, url: "/dashboard/appointments" },
        }, vapidPrivateKey, vapidPublicKey);
      } catch (sendError) {
        const errorMessage = sendError instanceof Error ? sendError.message : "Unknown error";
        await supabase.from("appointment_reminders").update({ status: "failed", error_message: errorMessage }).eq("id", reminder.id);
        results.failed++;
        results.errors.push(errorMessage);
      }
    }

    return new Response(JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error processing reminders:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
