import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ExtractRequest {
  document_text?: string;
  document_title?: string;
  document_category?: string;
  image_base64?: string;
  mime_type?: string;
  record_id?: string; // If provided, updates the health_record OCR fields
  auto_save?: boolean; // If true, saves extracted data directly to clinical tables
}

// ── AI Caller (Lovable AI Gateway – supports text + vision) ─────────────────

async function callLovableAI(
  prompt: string,
  apiKey: string,
  imageBase64?: string,
  mimeType?: string
): Promise<string | null> {
  const models = ['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite'];
  for (const model of models) {
    try {
      // Build multimodal content if image provided
      const content: any[] = [{ type: 'text', text: prompt }];
      if (imageBase64 && mimeType) {
        content.push({
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${imageBase64}` },
        });
      }
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content }], max_tokens: 8192 }),
      });
      if (res.status === 429 || res.status === 402) {
        console.warn(`AI rate/billing limit (${res.status}) on ${model}`);
        await res.text();
        continue;
      }
      if (res.ok) {
        const d = await res.json();
        return d?.choices?.[0]?.message?.content || null;
      }
      await res.text();
    } catch (e) { console.error(`AI ${model}:`, e); }
  }
  return null;
}

// callGeminiVision removed – vision is now handled via callLovableAI multimodal

// ── JSON Parser with repair ─────────────────────────────────────────────────

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1].trim());
    // Find first { and last }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) return JSON.parse(text.substring(start, end + 1));
    return JSON.parse(text);
  } catch {
    // Try to repair truncated JSON
    try {
      let json = text.substring(text.indexOf('{'));
      json = json.replace(/,\s*$/, '');
      let open = 0;
      for (const c of json) { if (c === '{') open++; if (c === '}') open--; }
      json += '}'.repeat(Math.max(0, open));
      json = json.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      return JSON.parse(json);
    } catch { return null; }
  }
}

// ── Extraction Prompt with Confidence Scoring ───────────────────────────────

const EXTRACTION_PROMPT = `You are a clinical data extraction assistant. Analyze the following medical document and extract ALL relevant clinical data.

Return a JSON object with ONLY sections that have data. For EVERY field, include a confidence score (0-100).

{
  "overall_confidence": 85,
  "abnormal_flags": [{"field": "bp_systolic", "value": "180", "reason": "Hypertensive crisis", "severity": "high"}],
  "background": {
    "family_history": {"value": "string or null", "confidence": 80},
    "lifestyle_notes": {"value": "string or null", "confidence": 70},
    "occupation": {"value": "string or null", "confidence": 60}
  },
  "comorbidities": {
    "comorbidity_list": {"value": ["array of conditions"], "confidence": 90},
    "icd10_mappings": {"value": {"condition": "ICD-10 code"}, "confidence": 85},
    "smoking_status": {"value": "never|former|current or null", "confidence": 70},
    "alcohol_consumption": {"value": "none|occasional|moderate|heavy or null", "confidence": 60}
  },
  "investigations": [
    {
      "investigation_type": {"value": "lab|imaging|vitals|biopsy", "confidence": 95},
      "investigation_date": {"value": "YYYY-MM-DD or null", "confidence": 80},
      "results": {"value": {"test_name": "value with units"}, "confidence": 90},
      "loinc_code": {"value": "LOINC code or null", "confidence": 70},
      "bp_systolic": {"value": "number or null", "confidence": 85},
      "bp_diastolic": {"value": "number or null", "confidence": 85},
      "weight_kg": {"value": "number or null", "confidence": 80},
      "notes": {"value": "string or null", "confidence": 75},
      "has_abnormal_values": {"value": true, "confidence": 95}
    }
  ],
  "treatments": [
    {
      "treatment_types": {"value": ["medication"|"therapy"|"dietary"|"other"], "confidence": 90},
      "medication_name": {"value": "string", "confidence": 95},
      "medication_dose": {"value": "string", "confidence": 85},
      "medication_frequency": {"value": "string", "confidence": 80},
      "is_active": {"value": true, "confidence": 70}
    }
  ],
  "care_team": [
    {
      "physician_name": {"value": "string", "confidence": 90},
      "specialty": {"value": "string or null", "confidence": 75}
    }
  ],
  "complications": {
    "current_complications": {"value": ["array"], "confidence": 85},
    "complication_notes": {"value": "string or null", "confidence": 70},
    "treatment_response": {"value": "string or null", "confidence": 65}
  }
}

IMPORTANT:
- Flag ALL abnormal values in the "abnormal_flags" array with severity: "low", "medium", "high", "critical"
- Use standard medical reference ranges for flagging
- Be precise, conservative, and use medical coding standards where possible.
- Set confidence < 50 for uncertain extractions.`;

// ── Flatten confidence-annotated data to simple values ──────────────────────

function flattenConfidenceData(data: Record<string, unknown>): {
  flat: Record<string, unknown>;
  fieldConfidences: Record<string, number>;
} {
  const flat: Record<string, unknown> = {};
  const fieldConfidences: Record<string, number> = {};

  for (const [key, value] of Object.entries(data)) {
    if (key === 'overall_confidence' || key === 'abnormal_flags') {
      flat[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      flat[key] = value.map((item: any) => {
        const flatItem: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(item)) {
          if (v && typeof v === 'object' && 'value' in (v as any) && 'confidence' in (v as any)) {
            flatItem[k] = (v as any).value;
            fieldConfidences[`${key}.${k}`] = (v as any).confidence;
          } else {
            flatItem[k] = v;
          }
        }
        return flatItem;
      });
    } else if (value && typeof value === 'object') {
      const flatSection: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (v && typeof v === 'object' && 'value' in (v as any) && 'confidence' in (v as any)) {
          flatSection[k] = (v as any).value;
          fieldConfidences[`${key}.${k}`] = (v as any).confidence;
        } else {
          flatSection[k] = v;
        }
      }
      flat[key] = flatSection;
    } else {
      flat[key] = value;
    }
  }
  return { flat, fieldConfidences };
}

// ── Auto-save extracted data to clinical tables ─────────────────────────────

async function autoSaveClinicalData(
  adminClient: any,
  userId: string,
  data: Record<string, unknown>,
  documentTitle: string
) {
  const sourceLabel = 'auto:document_ocr';
  const sourceRef = documentTitle;
  const saved: string[] = [];

  if (data.background && typeof data.background === 'object') {
    const bg = data.background as Record<string, unknown>;
    const { data: existing } = await adminClient
      .from('patient_background_info').select('id').eq('user_id', userId).maybeSingle();
    if (!existing) {
      await adminClient.from('patient_background_info').insert({
        user_id: userId, ...bg, source: sourceLabel, source_ref: sourceRef,
      });
      saved.push('background');
    }
  }

  if (data.comorbidities && typeof data.comorbidities === 'object') {
    const co = data.comorbidities as Record<string, unknown>;
    const { data: existing } = await adminClient
      .from('patient_comorbidities').select('id').eq('user_id', userId).maybeSingle();
    if (!existing) {
      await adminClient.from('patient_comorbidities').insert({
        user_id: userId,
        comorbidity_list: (co.comorbidity_list as string[]) || [],
        icd10_mappings: co.icd10_mappings || {},
        smoking_status: (co.smoking_status as string) || null,
        alcohol_consumption: (co.alcohol_consumption as string) || null,
        source: sourceLabel, source_ref: sourceRef,
      });
      saved.push('comorbidities');
    }
  }

  if (Array.isArray(data.investigations)) {
    for (const inv of data.investigations as any[]) {
      await adminClient.from('patient_clinical_investigations').insert({
        user_id: userId,
        investigation_type: inv.investigation_type || 'lab',
        investigation_date: inv.investigation_date || new Date().toISOString().split('T')[0],
        results: inv.results || {},
        loinc_code: inv.loinc_code || null,
        bp_systolic: inv.bp_systolic || null,
        bp_diastolic: inv.bp_diastolic || null,
        weight_kg: inv.weight_kg || null,
        notes: inv.notes || null,
        has_abnormal_values: inv.has_abnormal_values || false,
        source: sourceLabel, source_ref: sourceRef,
      });
    }
    saved.push('investigations');
  }

  if (Array.isArray(data.treatments)) {
    for (const tx of data.treatments as any[]) {
      await adminClient.from('patient_running_treatments').insert({
        user_id: userId,
        treatment_types: tx.treatment_types || ['medication'],
        medication_name: tx.medication_name || '',
        medication_dose: tx.medication_dose || '',
        medication_frequency: tx.medication_frequency || '',
        is_active: tx.is_active ?? true,
        treatment_start_date: new Date().toISOString().split('T')[0],
        source: sourceLabel, source_ref: sourceRef,
      });
    }
    saved.push('treatments');
  }

  if (Array.isArray(data.care_team)) {
    for (const m of data.care_team as any[]) {
      const { data: existing } = await adminClient
        .from('patient_care_team').select('id')
        .eq('user_id', userId).eq('physician_name', m.physician_name || '').maybeSingle();
      if (!existing) {
        await adminClient.from('patient_care_team').insert({
          user_id: userId,
          physician_name: m.physician_name || 'Unknown',
          specialty: m.specialty || null,
          source: sourceLabel, source_ref: sourceRef,
        });
      }
    }
    saved.push('care_team');
  }

  if (data.complications && typeof data.complications === 'object') {
    const comp = data.complications as Record<string, unknown>;
    const { data: existing } = await adminClient
      .from('patient_complications_status').select('id').eq('user_id', userId).maybeSingle();
    if (!existing) {
      await adminClient.from('patient_complications_status').insert({
        user_id: userId,
        current_complications: (comp.current_complications as string[]) || [],
        complication_notes: (comp.complication_notes as string) || null,
        treatment_response: (comp.treatment_response as string) || null,
        source: sourceLabel, source_ref: sourceRef,
      });
      saved.push('complications');
    }
  }

  return saved;
}

// ── Main Handler ────────────────────────────────────────────────────────────

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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const body = await req.json() as ExtractRequest;
    const adminClient = createClient(supabaseUrl, serviceKey);

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let aiResult: string | null = null;
    let extractedText: string | null = body.document_text || null;

    // Image provided → multimodal vision call via Lovable AI Gateway
    if (body.image_base64) {
      const fullPrompt = `${EXTRACTION_PROMPT}\n\nDocument title: ${body.document_title || 'Unknown'}\nCategory: ${body.document_category || 'Unknown'}\n\nAnalyze the document image below:`;
      aiResult = await callLovableAI(fullPrompt, lovableApiKey, body.image_base64, body.mime_type || 'image/jpeg');
    }

    // Text analysis via Lovable AI
    if (!aiResult && extractedText) {
      const fullPrompt = `${EXTRACTION_PROMPT}\n\nDocument title: ${body.document_title || 'Unknown'}\nCategory: ${body.document_category || 'Unknown'}\n\nDocument text:\n"""\n${extractedText.slice(0, 8000)}\n"""`;
      aiResult = await callLovableAI(fullPrompt, lovableApiKey);
    }

    // Title-only fallback
    if (!aiResult && !body.image_base64 && !extractedText && body.document_title) {
      const fullPrompt = `${EXTRACTION_PROMPT}\n\nDocument title: ${body.document_title}\nCategory: ${body.document_category || 'Unknown'}\n\nNo document content available - extract what you can from the title and category alone. Set all confidence values very low (below 30).`;
      aiResult = await callLovableAI(fullPrompt, lovableApiKey);
    }

    if (!aiResult) {
      // Update record OCR status if record_id provided
      if (body.record_id) {
        await adminClient.from('health_records').update({
          ocr_status: 'failed', ocr_extracted_at: new Date().toISOString(),
        }).eq('id', body.record_id);
      }
      return new Response(JSON.stringify({ extracted: null, message: 'No clinical data could be extracted' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawExtracted = parseJson(aiResult);
    if (!rawExtracted) {
      if (body.record_id) {
        await adminClient.from('health_records').update({
          ocr_status: 'failed', ocr_extracted_at: new Date().toISOString(),
        }).eq('id', body.record_id);
      }
      return new Response(JSON.stringify({ extracted: null, message: 'Failed to parse AI response' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Flatten confidence-annotated data
    const { flat: extracted, fieldConfidences } = flattenConfidenceData(rawExtracted);
    const overallConfidence = (rawExtracted.overall_confidence as number) || 50;
    const abnormalFlags = (rawExtracted.abnormal_flags as any[]) || [];

    // Update health_record OCR fields if record_id provided
    if (body.record_id) {
      await adminClient.from('health_records').update({
        ocr_status: 'completed',
        ocr_extracted_at: new Date().toISOString(),
        ocr_confidence: overallConfidence,
        ocr_field_confidences: fieldConfidences,
        ocr_extracted_text: extractedText?.slice(0, 10000) || null,
        ocr_clinical_data: extracted,
        ocr_abnormal_flags: abnormalFlags.length > 0 ? abnormalFlags : null,
      }).eq('id', body.record_id);
    }

    // Auto-save if requested
    let autoSavedTables: string[] = [];
    if (body.auto_save) {
      autoSavedTables = await autoSaveClinicalData(
        adminClient, userId, extracted, body.document_title || 'Uploaded document'
      );
    }

    return new Response(JSON.stringify({
      extracted,
      field_confidences: fieldConfidences,
      overall_confidence: overallConfidence,
      abnormal_flags: abnormalFlags,
      auto_saved_tables: autoSavedTables,
      message: body.auto_save
        ? `Clinical data extracted and saved to: ${autoSavedTables.join(', ') || 'no new records'}`
        : 'Clinical data extracted successfully. Review before saving.',
      user_id: userId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Extract clinical error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
