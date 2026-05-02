import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushToUser } from "../_shared/push-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderLog {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';

    console.log('Sending medication reminders...');

    const now = new Date().toISOString();

    const { data: pendingLogs, error: logsError } = await supabase
      .from('medication_reminder_logs')
      .select(`
        id, reminder_id, user_id, scheduled_for, status, snoozed_until, snooze_count,
        medication_reminders (
          medication_name, dosage, caregiver_name, caregiver_phone, caregiver_email, caregiver_alert_after_minutes
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (logsError) throw logsError;

    const dueReminders = ((pendingLogs as unknown as ReminderLog[]) || []).filter(log => {
      if (log.snoozed_until) return new Date(log.snoozed_until) <= new Date(now);
      return true;
    });

    console.log(`Found ${dueReminders.length} pending reminders to send`);

    let sentCount = 0;
    let failedCount = 0;
    let noSubscriptionCount = 0;
    let caregiverAlertCount = 0;

    for (const log of dueReminders) {
      try {
        const reminder = log.medication_reminders;
        const pushSent = await sendPushToUser(supabase, log.user_id, {
          title: "💊 Medication Reminder",
          body: `Time to take ${reminder.medication_name}${reminder.dosage ? ` (${reminder.dosage})` : ''}`,
          icon: "/pwa-192x192.png",
          badge: "/pwa-maskable-192x192.png",
          data: { type: "medication_reminder", log_id: log.id, reminder_id: log.reminder_id, url: "/dashboard/health-trends" },
          actions: [{ action: "take", title: "✓ Taken" }, { action: "skip", title: "Skip" }],
        }, vapidPrivateKey, vapidPublicKey);

        await supabase.from('medication_reminder_logs').update({ status: 'sent', sent_at: now }).eq('id', log.id);

        if (pushSent) { sentCount++; } else { noSubscriptionCount++; }

        await supabase.from('notifications').insert({
          user_id: log.user_id, type: 'medication_reminder', title: '💊 Medication Reminder',
          message: `Time to take ${reminder.medication_name}${reminder.dosage ? ` (${reminder.dosage})` : ''}`,
          metadata: { log_id: log.id, reminder_id: log.reminder_id, medication_name: reminder.medication_name },
        });
      } catch (error) {
        console.error('Error processing reminder:', error);
        failedCount++;
      }
    }

    // Caregiver alerts
    const { data: missedLogs } = await supabase
      .from('medication_reminder_logs')
      .select(`id, reminder_id, user_id, scheduled_for, sent_at, status,
        medication_reminders (medication_name, dosage, caregiver_name, caregiver_phone, caregiver_email, caregiver_alert_after_minutes)`)
      .eq('status', 'sent')
      .lte('scheduled_for', now);

    for (const missed of ((missedLogs as unknown as ReminderLog[]) || [])) {
      const reminder = missed.medication_reminders;
      if (!reminder.caregiver_name || !reminder.caregiver_alert_after_minutes) continue;
      const thresholdMs = reminder.caregiver_alert_after_minutes * 60 * 1000;
      if (Date.now() - new Date(missed.scheduled_for).getTime() <= thresholdMs) continue;

      const { data: existingAlert } = await supabase
        .from('notifications').select('id').eq('type', 'caregiver_alert').eq('metadata->>log_id', missed.id).maybeSingle();
      if (existingAlert) continue;

      await supabase.from('notifications').insert({
        user_id: missed.user_id, type: 'caregiver_alert', title: '🚨 Caregiver Notified',
        message: `${reminder.caregiver_name} has been notified that you missed ${reminder.medication_name}`,
        metadata: { log_id: missed.id, caregiver_name: reminder.caregiver_name, medication_name: reminder.medication_name },
      });
      await supabase.from('medication_reminder_logs').update({ status: 'missed' }).eq('id', missed.id);
      caregiverAlertCount++;
    }

    console.log(`Results: ${sentCount} sent, ${failedCount} failed, ${noSubscriptionCount} no subscription, ${caregiverAlertCount} caregiver alerts`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount, no_subscription: noSubscriptionCount, caregiver_alerts: caregiverAlertCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending medication reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
