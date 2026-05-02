import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Use incremental verification (picks up from last checkpoint)
    const { data, error } = await supabase.rpc('verify_audit_trail_incremental');
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    const brokenCount = Number(row?.broken_chain_count ?? 0);
    const integrity = Number(row?.integrity_percentage ?? 100);
    const totalNew = Number(row?.total_new_entries ?? 0);
    const checkpointBlock = Number(row?.checkpoint_block ?? 0);
    const isIncremental = Boolean(row?.is_incremental);

    console.log(`Audit integrity check (${isIncremental ? 'incremental' : 'full'}): ${integrity}% — ${totalNew} new entries, ${brokenCount} broken, checkpoint block ${checkpointBlock}`);

    // Alert admins only if broken links found
    if (brokenCount > 0) {
      const { data: admins, error: adminErr } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminErr) throw adminErr;

      if (admins && admins.length > 0) {
        const notifications = admins.map((a: { user_id: string }) => ({
          user_id: a.user_id,
          type: 'system_alert',
          title: 'Audit Trail Integrity Alert',
          message: `Scheduled check detected ${brokenCount} broken hash link(s) in ${totalNew} new entries. Review System Health dashboard.`,
          is_read: false,
          metadata: { broken_count: brokenCount, integrity_percentage: integrity, checkpoint_block: checkpointBlock, is_incremental: isIncremental },
        }));

        const { error: notifErr } = await supabase.from('notifications').insert(notifications);
        if (notifErr) console.error('Failed to insert notifications:', notifErr.message);
        else console.log(`Alerted ${admins.length} admin(s)`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, integrity_percentage: integrity, broken_count: brokenCount, total_new_entries: totalNew, checkpoint_block: checkpointBlock, is_incremental: isIncremental }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Audit integrity check failed:', (err as Error).message);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
