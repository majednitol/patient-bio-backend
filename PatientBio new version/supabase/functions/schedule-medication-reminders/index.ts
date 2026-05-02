import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Scheduling medication reminders...');

    // Get all active medication reminders
    const { data: reminders, error: remindersError } = await supabase
      .from('medication_reminders')
      .select('*')
      .eq('is_active', true);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} active reminders`);

    const now = new Date();
    const hoursAhead = 24;
    const endWindow = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    
    let scheduledCount = 0;
    let skippedCount = 0;

    for (const reminder of (reminders as MedicationReminder[]) || []) {
      const occurrences = getNextOccurrences(reminder, now, endWindow);
      
      for (const occurrence of occurrences) {
        // Check if log entry already exists for this time slot
        const scheduledFor = occurrence.toISOString();
        const { data: existingLog, error: checkError } = await supabase
          .from('medication_reminder_logs')
          .select('id')
          .eq('reminder_id', reminder.id)
          .eq('scheduled_for', scheduledFor)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing log:', checkError);
          continue;
        }

        if (existingLog) {
          skippedCount++;
          continue;
        }

        // Create pending log entry
        const { error: insertError } = await supabase
          .from('medication_reminder_logs')
          .insert({
            reminder_id: reminder.id,
            user_id: reminder.user_id,
            scheduled_for: scheduledFor,
            status: 'pending',
          });

        if (insertError) {
          console.error('Error creating log entry:', insertError);
          continue;
        }

        scheduledCount++;
        console.log(`Scheduled reminder for ${reminder.medication_name} at ${scheduledFor}`);
      }
    }

    console.log(`Scheduled ${scheduledCount} new reminders, skipped ${skippedCount} existing`);

    return new Response(
      JSON.stringify({
        success: true,
        scheduled: scheduledCount,
        skipped: skippedCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error scheduling medication reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getNextOccurrences(reminder: MedicationReminder, start: Date, end: Date): Date[] {
  const occurrences: Date[] = [];
  
  // Check up to 2 days ahead to cover the window
  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    const checkDate = new Date(start);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    const dayOfWeek = checkDate.getDay();
    
    // Skip if this day is not in the schedule
    if (!reminder.days_of_week.includes(dayOfWeek)) {
      continue;
    }
    
    for (const timeStr of reminder.reminder_times) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const occurrence = new Date(checkDate);
      occurrence.setHours(hours, minutes, 0, 0);
      
      // Only include if within our window
      if (occurrence > start && occurrence <= end) {
        occurrences.push(occurrence);
      }
    }
  }
  
  return occurrences;
}
