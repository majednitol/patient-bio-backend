/**
 * Unified Reminder Processor
 * 
 * Combines all 4 reminder operations into a single edge function invocation:
 *   1. Schedule medication reminders (24h lookahead)
 *   2. Send due medication reminders + caregiver alerts
 *   3. Schedule appointment reminders (48h lookahead)
 *   4. Send due appointment reminders
 * 
 * This eliminates 3 cold starts per cron cycle (~150-350ms each).
 * Individual functions are preserved for direct API calls.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushToUser } from "../_shared/push-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MedicationReminder {
  id: string;
  user_id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string;
  reminder_times: string[];
  days_of_week: number[];
  is_active: boolean;
}

interface MedReminderLog {
  id: string;
  reminder_id: string;
  user_id: string;
  scheduled_for: string;
  status: string;
  snoozed_until: string | null;
  snooze_count: number;
  medication_reminders: {
    medication_name: string;
    dosage: string | null;
    caregiver_name: string | null;
    caregiver_phone: string | null;
    caregiver_email: string | null;
    caregiver_alert_after_minutes: number | null;
  };
}

interface AppointmentDetails {
  id: string;
  appointment_date: string;
  start_time: string;
  reason: string | null;
  patient_id: string;
  doctor_id: string;
  hospital_id: string | null;
  status: string;
  patient_profile: { display_name: string | null; phone: string | null } | null;
  doctor_profile: { full_name: string } | null;
  hospital: { name: string } | null;
}

// ─── Medication Scheduling ───────────────────────────────────────
async function scheduleMedicationReminders(supabase: any): Promise<{ scheduled: number; skipped: number }> {
  const { data: reminders, error } = await supabase
    .from("medication_reminders")
    .select("id, user_id, medication_name, dosage, frequency, reminder_times, days_of_week, is_active")
    .eq("is_active", true);

  if (error) throw error;

  const now = new Date();
  const endWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  let scheduled = 0, skipped = 0;

  for (const reminder of (reminders as MedicationReminder[]) || []) {
    const occurrences = getNextOccurrences(reminder, now, endWindow);

    for (const occurrence of occurrences) {
      const scheduledFor = occurrence.toISOString();
      const { data: existing } = await supabase
        .from("medication_reminder_logs")
        .select("id")
        .eq("reminder_id", reminder.id)
        .eq("scheduled_for", scheduledFor)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      const { error: insertError } = await supabase
        .from("medication_reminder_logs")
        .insert({ reminder_id: reminder.id, user_id: reminder.user_id, scheduled_for: scheduledFor, status: "pending" });

      if (!insertError) scheduled++;
    }
  }

  return { scheduled, skipped };
}

function getNextOccurrences(reminder: MedicationReminder, start: Date, end: Date): Date[] {
  const occurrences: Date[] = [];
  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    const checkDate = new Date(start);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    if (!reminder.days_of_week.includes(checkDate.getDay())) continue;
    for (const timeStr of reminder.reminder_times) {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const occ = new Date(checkDate);
      occ.setHours(hours, minutes, 0, 0);
      if (occ > start && occ <= end) occurrences.push(occ);
    }
  }
  return occurrences;
}

// ─── Medication Sending ──────────────────────────────────────────
async function sendMedicationReminders(
  supabase: any, vapidPrivateKey: string, vapidPublicKey: string
): Promise<{ sent: number; failed: number; caregiverAlerts: number }> {
  const now = new Date().toISOString();

  const { data: pendingLogs, error } = await supabase
    .from("medication_reminder_logs")
    .select(`id, reminder_id, user_id, scheduled_for, status, snoozed_until, snooze_count,
      medication_reminders (medication_name, dosage, caregiver_name, caregiver_phone, caregiver_email, caregiver_alert_after_minutes)`)
    .eq("status", "pending")
    .lte("scheduled_for", now);

  if (error) throw error;

  const dueReminders = ((pendingLogs as unknown as MedReminderLog[]) || []).filter((log) => {
    if (log.snoozed_until) return new Date(log.snoozed_until) <= new Date(now);
    return true;
  });

  let sent = 0, failed = 0, caregiverAlerts = 0;

  for (const log of dueReminders) {
    const reminder = log.medication_reminders;

    await sendPushToUser(supabase, log.user_id, {
      title: "💊 Medication Reminder",
      body: `Time to take ${reminder.medication_name}${reminder.dosage ? ` (${reminder.dosage})` : ""}`,
      icon: "/pwa-192x192.png",
      badge: "/pwa-maskable-192x192.png",
      data: { type: "medication_reminder", log_id: log.id, reminder_id: log.reminder_id, url: "/dashboard/health-trends" },
      actions: [{ action: "take", title: "✓ Taken" }, { action: "skip", title: "Skip" }],
    }, vapidPrivateKey, vapidPublicKey);

    await supabase.from("medication_reminder_logs").update({ status: "sent", sent_at: now }).eq("id", log.id);
    await supabase.from("notifications").insert({
      user_id: log.user_id, type: "medication_reminder", title: "💊 Medication Reminder",
      message: `Time to take ${reminder.medication_name}${reminder.dosage ? ` (${reminder.dosage})` : ""}`,
      metadata: { log_id: log.id, reminder_id: log.reminder_id, medication_name: reminder.medication_name },
    });
    sent++;
  }

  // Caregiver alerts for missed medications
  const { data: missedLogs } = await supabase
    .from("medication_reminder_logs")
    .select(`id, reminder_id, user_id, scheduled_for, sent_at, status,
      medication_reminders (medication_name, dosage, caregiver_name, caregiver_phone, caregiver_email, caregiver_alert_after_minutes)`)
    .eq("status", "sent")
    .lte("scheduled_for", now);

  for (const missed of ((missedLogs as unknown as MedReminderLog[]) || [])) {
    const r = missed.medication_reminders;
    if (!r.caregiver_name || !r.caregiver_alert_after_minutes) continue;
    const thresholdMs = r.caregiver_alert_after_minutes * 60 * 1000;
    if (Date.now() - new Date(missed.scheduled_for).getTime() <= thresholdMs) continue;

    const { data: existing } = await supabase
      .from("notifications").select("id").eq("type", "caregiver_alert").eq("metadata->>log_id", missed.id).maybeSingle();
    if (existing) continue;

    const { data: profile } = await supabase.from("user_profiles").select("display_name").eq("user_id", missed.user_id).maybeSingle();
    await supabase.from("notifications").insert({
      user_id: missed.user_id, type: "caregiver_alert", title: "🚨 Caregiver Notified",
      message: `${r.caregiver_name} has been notified that you missed ${r.medication_name}`,
      metadata: { log_id: missed.id, caregiver_name: r.caregiver_name, medication_name: r.medication_name },
    });
    await supabase.from("medication_reminder_logs").update({ status: "missed" }).eq("id", missed.id);
    caregiverAlerts++;
  }

  return { sent, failed, caregiverAlerts };
}

// ─── Appointment Scheduling ─────────────────────────────────────
async function scheduleAppointmentReminders(supabase: any): Promise<{ scheduled: number; skipped: number }> {
  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id, appointment_date, start_time, patient_id, status")
    .gte("appointment_date", now.toISOString().split("T")[0])
    .lte("appointment_date", in48Hours.toISOString().split("T")[0])
    .in("status", ["scheduled", "confirmed"]);

  if (error) throw error;
  let scheduled = 0, skipped = 0;

  for (const appt of appointments || []) {
    const { data: prefs } = await supabase
      .from("appointment_reminder_preferences")
      .select("email_enabled, sms_enabled, reminder_hours")
      .eq("user_id", appt.patient_id)
      .single();

    const emailEnabled = prefs?.email_enabled ?? true;
    const smsEnabled = prefs?.sms_enabled ?? false;
    const reminderHours = prefs?.reminder_hours ?? [24];

    if (!emailEnabled && !smsEnabled) { skipped++; continue; }

    const apptDateTime = new Date(`${appt.appointment_date}T${appt.start_time}`);

    for (const hours of reminderHours) {
      const scheduledFor = new Date(apptDateTime.getTime() - hours * 60 * 60 * 1000);
      if (scheduledFor <= now) continue;

      const { data: existing } = await supabase
        .from("appointment_reminders").select("id").eq("appointment_id", appt.id).eq("hours_before", hours);
      if (existing && existing.length > 0) continue;

      if (emailEnabled) {
        await supabase.from("appointment_reminders").insert({
          appointment_id: appt.id, reminder_type: "email", hours_before: hours,
          scheduled_for: scheduledFor.toISOString(), status: "pending",
        });
        scheduled++;
      }
      if (smsEnabled) {
        await supabase.from("appointment_reminders").insert({
          appointment_id: appt.id, reminder_type: "sms", hours_before: hours,
          scheduled_for: scheduledFor.toISOString(), status: "pending",
        });
        scheduled++;
      }
    }
  }

  return { scheduled, skipped };
}

// ─── Appointment Sending ─────────────────────────────────────────
async function sendAppointmentReminders(
  supabase: any, vapidPrivateKey: string, vapidPublicKey: string
): Promise<{ sent: number; failed: number; skipped: number }> {
  const now = new Date().toISOString();
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  const { data: pending, error } = await supabase
    .from("appointment_reminders")
    .select("id, appointment_id, reminder_type, hours_before, scheduled_for")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .limit(50);

  if (error) throw error;
  if (!pending || pending.length === 0) return { sent: 0, failed: 0, skipped: 0 };

  let sent = 0, failed = 0, skipped = 0;

  for (const reminder of pending) {
    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select(`id, appointment_date, start_time, reason, patient_id, doctor_id, hospital_id, status,
        patient_profile:user_profiles!appointments_patient_id_fkey(display_name, phone),
        doctor_profile:doctor_profiles!appointments_doctor_id_fkey(full_name),
        hospital:hospitals(name)`)
      .eq("id", reminder.appointment_id)
      .single();

    if (apptError || !appointment) {
      await supabase.from("appointment_reminders").update({ status: "failed", error_message: "Appointment not found" }).eq("id", reminder.id);
      failed++;
      continue;
    }

    const appt = appointment as unknown as AppointmentDetails;

    if (appt.status === "cancelled") {
      await supabase.from("appointment_reminders").update({ status: "cancelled", error_message: "Appointment was cancelled" }).eq("id", reminder.id);
      skipped++;
      continue;
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(appt.patient_id);
    const patientEmail = authUser?.user?.email;
    const patientName = appt.patient_profile?.display_name || "Patient";
    const doctorName = appt.doctor_profile?.full_name || "Doctor";
    const hospitalName = appt.hospital?.name || "";

    const apptDate = new Date(`${appt.appointment_date}T${appt.start_time}`);
    const formattedDate = apptDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const formattedTime = apptDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    try {
      if (reminder.reminder_type === "email" && resendApiKey && patientEmail) {
        const emailResp = await fetch("https://api.resend.com/emails", {
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
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
                ${hospitalName ? `<p><strong>Location:</strong> ${hospitalName}</p>` : ""}
              </div>
              <p>Please arrive 10-15 minutes early.</p>
              <p>Best regards,<br>Patient Bio Team</p>
            </div>`,
          }),
        });
        if (!emailResp.ok) throw new Error(`Resend: ${await emailResp.text()}`);
        await supabase.from("appointment_reminders").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", reminder.id);
        sent++;
      } else {
        await supabase.from("appointment_reminders").update({ status: "failed", error_message: "Missing email config or address" }).eq("id", reminder.id);
        skipped++;
      }

      // In-app notification
      await supabase.from("notifications").insert({
        user_id: appt.patient_id, type: "appointment_reminder", title: "Upcoming Appointment Reminder",
        message: `Reminder: You have an appointment with Dr. ${doctorName} on ${formattedDate} at ${formattedTime}${hospitalName ? ` at ${hospitalName}` : ""}.`,
      });

      // Push notification
      await sendPushToUser(supabase, appt.patient_id, {
        title: "📅 Appointment Reminder",
        body: `Appointment with Dr. ${doctorName} on ${formattedDate} at ${formattedTime}`,
        icon: "/pwa-192x192.png", badge: "/pwa-maskable-192x192.png",
        data: { type: "appointment_reminder", appointment_id: appt.id, url: "/dashboard/appointments" },
      }, vapidPrivateKey, vapidPublicKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await supabase.from("appointment_reminders").update({ status: "failed", error_message: msg }).eq("id", reminder.id);
      failed++;
    }
  }

  return { sent, failed, skipped };
}

// ─── Main Handler ────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

    // Run all 4 phases sequentially (they share DB state)
    console.log("[process-all-reminders] Starting unified reminder cycle...");

    const medSchedule = await scheduleMedicationReminders(supabase);
    console.log(`[med-schedule] ${medSchedule.scheduled} scheduled, ${medSchedule.skipped} skipped`);

    const medSend = await sendMedicationReminders(supabase, vapidPrivateKey, vapidPublicKey);
    console.log(`[med-send] ${medSend.sent} sent, ${medSend.caregiverAlerts} caregiver alerts`);

    const apptSchedule = await scheduleAppointmentReminders(supabase);
    console.log(`[appt-schedule] ${apptSchedule.scheduled} scheduled, ${apptSchedule.skipped} skipped`);

    const apptSend = await sendAppointmentReminders(supabase, vapidPrivateKey, vapidPublicKey);
    console.log(`[appt-send] ${apptSend.sent} sent, ${apptSend.failed} failed`);

    const elapsed = Date.now() - startTime;
    console.log(`[process-all-reminders] Completed in ${elapsed}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        elapsed_ms: elapsed,
        medication: { schedule: medSchedule, send: medSend },
        appointment: { schedule: apptSchedule, send: apptSend },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[process-all-reminders] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
