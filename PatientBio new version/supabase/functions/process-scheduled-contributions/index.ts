import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find due schedules
    const { data: dueSchedules, error: fetchError } = await supabase
      .from('contribution_schedules')
      .select('*')
      .eq('is_paused', false)
      .lte('next_run_at', new Date().toISOString())
      .limit(50);

    if (fetchError) throw fetchError;
    if (!dueSchedules || dueSchedules.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;

    for (const schedule of dueSchedules) {
      try {
        // Invoke anonymize-health-data as the patient
        // We use service role to read the patient's data
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const patientSupabase = createClient(supabaseUrl, anonKey);

        // Call the anonymize function via HTTP with service role
        const anonResponse = await fetch(`${supabaseUrl}/functions/v1/anonymize-health-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'x-patient-id': schedule.patient_id,
          },
          body: JSON.stringify({
            categories: schedule.categories,
            jurisdiction: schedule.jurisdiction,
            scheduled_patient_id: schedule.patient_id,
          }),
        });

        if (!anonResponse.ok) {
          console.error(`Failed to anonymize for schedule ${schedule.id}`);
          continue;
        }

        const anonData = await anonResponse.json();

        // Insert new contribution
        const { data: inserted, error: insertError } = await supabase
          .from('anonymous_health_contributions')
          .insert([{
            patient_id: schedule.patient_id,
            contribution_hash: anonData.contribution_hash,
            anonymized_data: anonData.anonymized_data,
            data_categories: anonData.data_categories,
            disease_categories: anonData.disease_categories,
            age_range: anonData.age_range,
            gender: anonData.gender,
            source_jurisdiction: anonData.source_jurisdiction,
            requires_govt_approval: anonData.requires_govt_approval,
            govt_approval_status: anonData.govt_approval_status,
            quality_score: anonData.quality_score,
          }])
          .select('id')
          .single();

        if (insertError) {
          console.error(`Insert failed for schedule ${schedule.id}:`, insertError);
          continue;
        }

        // Calculate next run
        const now = new Date();
        let nextRun: Date;
        switch (schedule.cadence) {
          case 'weekly':
            nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'monthly':
            nextRun = new Date(now);
            nextRun.setMonth(nextRun.getMonth() + 1);
            break;
          case 'quarterly':
            nextRun = new Date(now);
            nextRun.setMonth(nextRun.getMonth() + 3);
            break;
          default:
            nextRun = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        // Update schedule
        await supabase
          .from('contribution_schedules')
          .update({
            last_contribution_id: inserted.id,
            next_run_at: nextRun.toISOString(),
          })
          .eq('id', schedule.id);

        processed++;
      } catch (e) {
        console.error(`Error processing schedule ${schedule.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ processed, total: dueSchedules.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Scheduled contributions error:', error);
    return new Response(JSON.stringify({ error: 'Processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
