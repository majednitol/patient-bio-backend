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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get last active contribution
    const { data: lastContribution } = await supabase
      .from('anonymous_health_contributions')
      .select('id, contributed_at, data_categories, disease_categories, anonymized_data')
      .eq('patient_id', user.id)
      .eq('is_active', true)
      .order('contributed_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastContribution) {
      return new Response(JSON.stringify({ has_changes: false, summary: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const since = lastContribution.contributed_at;

    // Count new records since last contribution
    const [{ count: rxCount }, { count: hrCount }] = await Promise.all([
      supabase.from('prescriptions').select('*', { count: 'exact', head: true })
        .eq('patient_id', user.id).gt('created_at', since),
      supabase.from('health_records').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).gt('created_at', since),
    ]);

    const newPrescriptions = rxCount || 0;
    const newHealthRecords = hrCount || 0;
    const totalNew = newPrescriptions + newHealthRecords;

    if (totalNew === 0) {
      return new Response(JSON.stringify({ has_changes: false, summary: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get disease categories of new records for context
    const { data: newRx } = await supabase
      .from('prescriptions')
      .select('disease_category')
      .eq('patient_id', user.id)
      .gt('created_at', since)
      .limit(20);

    const { data: newHr } = await supabase
      .from('health_records')
      .select('disease_category, category')
      .eq('user_id', user.id)
      .gt('created_at', since)
      .limit(20);

    const newDiseases = [...new Set([
      ...(newRx || []).map(r => r.disease_category).filter(Boolean),
      ...(newHr || []).map(r => r.disease_category).filter(Boolean),
    ])];

    const newCategories = [...new Set((newHr || []).map(r => r.category).filter(Boolean))];

    // Generate AI summary
    let aiSummary = '';
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (lovableKey) {
      try {
        const prompt = `You are a health data research assistant. A patient has ${newPrescriptions} new prescriptions and ${newHealthRecords} new health records since their last anonymous research contribution. New disease areas: ${newDiseases.join(', ') || 'general'}. New record types: ${newCategories.join(', ') || 'mixed'}. Write a brief 1-2 sentence summary explaining what changed and why updating their contribution would help research. Be encouraging but factual. Do not use any markdown.`;

        const aiResponse = await fetch('https://lovable.dev/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiSummary = aiData?.choices?.[0]?.message?.content || '';
        }
      } catch (e) {
        console.error('AI summary failed:', e);
      }
    }

    // Fallback summary
    if (!aiSummary) {
      const parts: string[] = [];
      if (newPrescriptions > 0) parts.push(`${newPrescriptions} new prescription${newPrescriptions > 1 ? 's' : ''}`);
      if (newHealthRecords > 0) parts.push(`${newHealthRecords} new health record${newHealthRecords > 1 ? 's' : ''}`);
      aiSummary = `You have ${parts.join(' and ')}${newDiseases.length > 0 ? ` related to ${newDiseases.slice(0, 3).join(', ')}` : ''}. Updating your contribution would strengthen the research dataset.`;
    }

    // Estimate impact score change
    const impactDelta = Math.min(Math.round(totalNew * 2), 15);

    return new Response(JSON.stringify({
      has_changes: true,
      new_prescriptions: newPrescriptions,
      new_health_records: newHealthRecords,
      new_diseases: newDiseases,
      new_categories: newCategories,
      summary: aiSummary,
      estimated_impact_delta: impactDelta,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Smart recontribution check error:', error);
    return new Response(JSON.stringify({ error: 'Check failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
