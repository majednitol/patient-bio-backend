import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AutoPopulateRequest {
  patient_id: string;
  source_type: 'prescription' | 'visit_summary';
  source_id: string;
  diagnosis?: string;
  summary_text?: string;
  doctor_name?: string;
}

async function callLovableAI(prompt: string, apiKey: string): Promise<string | null> {
  const models = ['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite'];
  
  for (const model of models) {
    try {
      const response = await fetch('https://lovable.dev/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4096,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data?.choices?.[0]?.message?.content || null;
      }
      console.error(`AI model ${model} failed with status ${response.status}`);
    } catch (e) {
      console.error(`AI model ${model} error:`, e);
    }
  }
  return null;
}

function parseJsonResponse(text: string): Record<string, unknown> | null {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1].trim());
    return JSON.parse(text);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { patient_id, source_type, source_id, diagnosis, summary_text, doctor_name } =
      await req.json() as AutoPopulateRequest;

    if (!patient_id || !source_type || !source_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const textToAnalyze = [diagnosis, summary_text].filter(Boolean).join('\n\n');

    if (!textToAnalyze || !lovableApiKey) {
      return new Response(JSON.stringify({ message: 'No text to analyze or AI not configured', extracted: null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are a clinical data extraction assistant. Analyze the following medical text from a doctor's ${source_type === 'prescription' ? 'prescription/diagnosis' : 'visit summary'} and extract structured clinical data.

Text to analyze:
"""
${textToAnalyze}
"""

Return a JSON object with ONLY the fields you can confidently extract (omit fields with no data):
{
  "background": {
    "family_history": "string or null",
    "lifestyle_notes": "string or null",
    "occupation": "string or null"
  },
  "comorbidities": {
    "comorbidity_list": ["array of conditions"],
    "icd10_mappings": {"condition": "ICD-10 code"},
    "smoking_status": "never|former|current or null",
    "alcohol_consumption": "none|occasional|moderate|heavy or null"
  },
  "complications": {
    "current_complications": ["array of complications"],
    "complication_notes": "string or null",
    "treatment_response": "string or null"
  }
}

Only include sections where you have actual data. Be precise and conservative.`;

    const aiResult = await callLovableAI(prompt, lovableApiKey);
    const extracted = aiResult ? parseJsonResponse(aiResult) : null;

    if (!extracted) {
      return new Response(JSON.stringify({ message: 'AI extraction returned no results', extracted: null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sourceLabel = source_type === 'prescription' 
      ? `auto:prescription` 
      : `auto:visit_summary`;
    const sourceRef = doctor_name 
      ? `${source_id} | ${doctor_name}` 
      : source_id;
    let updatedTables: string[] = [];

    // Upsert background info
    if (extracted.background && typeof extracted.background === 'object') {
      const bg = extracted.background as Record<string, string>;
      const { data: existing } = await adminClient
        .from('patient_background_info')
        .select('id')
        .eq('user_id', patient_id)
        .maybeSingle();

      if (!existing) {
        await adminClient.from('patient_background_info').insert({
          user_id: patient_id,
          family_history: bg.family_history || null,
          lifestyle_notes: bg.lifestyle_notes || null,
          occupation: bg.occupation || null,
          source: sourceLabel,
          source_ref: sourceRef,
        });
        updatedTables.push('background');
      }
    }

    // Upsert comorbidities
    if (extracted.comorbidities && typeof extracted.comorbidities === 'object') {
      const co = extracted.comorbidities as Record<string, unknown>;
      const { data: existing } = await adminClient
        .from('patient_comorbidities')
        .select('id')
        .eq('user_id', patient_id)
        .maybeSingle();

      if (!existing) {
        await adminClient.from('patient_comorbidities').insert({
          user_id: patient_id,
          comorbidity_list: (co.comorbidity_list as string[]) || [],
          icd10_mappings: co.icd10_mappings || {},
          smoking_status: (co.smoking_status as string) || null,
          alcohol_consumption: (co.alcohol_consumption as string) || null,
          source: sourceLabel,
          source_ref: sourceRef,
        });
        updatedTables.push('comorbidities');
      }
    }

    // Upsert complications
    if (extracted.complications && typeof extracted.complications === 'object') {
      const comp = extracted.complications as Record<string, unknown>;
      const { data: existing } = await adminClient
        .from('patient_complications_status')
        .select('id')
        .eq('user_id', patient_id)
        .maybeSingle();

      if (!existing) {
        await adminClient.from('patient_complications_status').insert({
          user_id: patient_id,
          current_complications: (comp.current_complications as string[]) || [],
          complication_notes: (comp.complication_notes as string) || null,
          treatment_response: (comp.treatment_response as string) || null,
          source: sourceLabel,
          source_ref: sourceRef,
        });
        updatedTables.push('complications');
      }
    }

    return new Response(JSON.stringify({
      message: 'Auto-population complete',
      updated_tables: updatedTables,
      extracted,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Auto-populate error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
