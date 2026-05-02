import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  getCorrelationId, 
  createLogger,
  withCorrelationHeaders 
} from '../_shared/correlationId.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  const correlationId = getCorrelationId(req);
  const logger = createLogger(correlationId, 'generate-visit-summary');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: withCorrelationHeaders(corsHeaders, correlationId) });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { appointmentId } = await req.json();
    if (!appointmentId) {
      return new Response(JSON.stringify({ error: 'Missing appointmentId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logger.info('Generating visit summary', { appointmentId });

    // Fetch appointment with patient info
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('*, patient_profile:user_profiles!appointments_patient_id_fkey(display_name)')
      .eq('id', appointmentId)
      .single();

    if (aptError || !appointment) {
      return new Response(JSON.stringify({ error: 'Appointment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the requesting doctor owns this appointment
    if (appointment.doctor_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not authorized for this appointment' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch related data in parallel
    const [prescriptionsRes, intakeRes, vitalsRes, healthDataRes] = await Promise.all([
      supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', appointment.patient_id)
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('appointment_intake')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle(),
      supabase
        .from('patient_vitals')
        .select('*')
        .eq('patient_id', appointment.patient_id)
        .order('recorded_at', { ascending: false })
        .limit(1),
      supabase
        .from('health_data')
        .select('blood_group, health_allergies, current_medications, health_conditions')
        .eq('user_id', appointment.patient_id)
        .maybeSingle(),
    ]);

    const prescriptions = prescriptionsRes.data || [];
    const intake = intakeRes.data;
    const latestVitals = vitalsRes.data?.[0];
    const healthData = healthDataRes.data;

    // Build context for AI
    const patientName = (appointment as any).patient_profile?.display_name || 'the patient';
    let context = `Patient: ${patientName}\nVisit Date: ${appointment.appointment_date}\n`;
    if (appointment.reason) context += `Reason for Visit: ${appointment.reason}\n`;
    if (intake) {
      if (intake.chief_complaint) context += `Chief Complaint: ${intake.chief_complaint}\n`;
      if (intake.symptom_severity) context += `Symptom Severity: ${intake.symptom_severity}\n`;
      if (intake.symptom_duration) context += `Symptom Duration: ${intake.symptom_duration}\n`;
      if (intake.self_medications) context += `Self-Medications: ${intake.self_medications}\n`;
    }
    if (latestVitals) {
      context += `Vitals: BP ${latestVitals.bp_systolic}/${latestVitals.bp_diastolic}, HR ${latestVitals.heart_rate}, Temp ${latestVitals.temperature}°C, SpO2 ${latestVitals.spo2}%, Weight ${latestVitals.weight}kg\n`;
    }
    if (healthData) {
      if (healthData.health_allergies) context += `Known Allergies: ${healthData.health_allergies}\n`;
      if (healthData.health_conditions) context += `Existing Conditions: ${healthData.health_conditions}\n`;
    }
    if (prescriptions.length > 0) {
      context += `\nPrescriptions from this visit:\n`;
      for (const rx of prescriptions) {
        const meds = rx.medications as any[];
        if (meds?.length) {
          for (const m of meds) {
            context += `- ${m.name} ${m.dosage || ''} ${m.frequency || ''}\n`;
          }
        }
        if (rx.general_instructions) context += `Instructions: ${rx.general_instructions}\n`;
        if (rx.diagnosis) context += `Diagnosis: ${rx.diagnosis}\n`;
      }
    }

    const prompt = `Patient-friendly visit summary. Warm, simple language, address patient as "you".

${context}

JSON: {"summary_text":"2-3 paragraphs, <=500chars","diagnosis":"1-2 sentences, <=300chars","medications_summary":"<=300chars, or 'No new medications'","follow_up_instructions":"<=300chars, next steps"} Don't invent data not provided.`;
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    let summaryData: { summary_text: string; diagnosis: string; medications_summary: string; follow_up_instructions: string };

    if (!geminiApiKey) {
      logger.warn('GOOGLE_GEMINI_API_KEY not configured, using fallback');
      summaryData = buildFallbackSummary(patientName, appointment, prescriptions, intake, latestVitals);
    } else {
      const models = ['gemini-2.5-flash-lite', 'gemini-2.0-flash'];
      let aiResponse: Response | null = null;

      for (const model of models) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 512,
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (response.ok) {
          aiResponse = response;
          break;
        }
        if (response.status === 429) continue;
        const errText = await response.text();
        logger.error(`AI error on ${model}`, { error: errText });
      }

      if (aiResponse) {
        try {
          const aiData = await aiResponse.json();
          const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            summaryData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON in AI response');
          }
        } catch {
          logger.warn('Failed to parse AI response, using fallback');
          summaryData = buildFallbackSummary(patientName, appointment, prescriptions, intake, latestVitals);
        }
      } else {
        summaryData = buildFallbackSummary(patientName, appointment, prescriptions, intake, latestVitals);
      }
    }

    // Upsert the summary
    const { data: summary, error: upsertError } = await supabase
      .from('visit_summaries')
      .upsert({
        appointment_id: appointmentId,
        patient_id: appointment.patient_id,
        doctor_id: user.id,
        summary_text: summaryData.summary_text,
        diagnosis: summaryData.diagnosis,
        medications_summary: summaryData.medications_summary,
        follow_up_instructions: summaryData.follow_up_instructions,
        is_approved: false,
      }, { onConflict: 'appointment_id' })
      .select()
      .single();

    if (upsertError) {
      logger.error('Failed to save summary', { error: upsertError.message });
      return new Response(JSON.stringify({ error: 'Failed to save summary' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logger.info('Visit summary generated', { summaryId: summary.id });

    return new Response(JSON.stringify({ success: true, data: summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-correlation-id': correlationId },
    });
  } catch (error) {
    logger.error('Unexpected error', { error: (error as Error).message });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildFallbackSummary(
  patientName: string,
  appointment: any,
  prescriptions: any[],
  intake: any,
  vitals: any,
) {
  const reason = appointment.reason || intake?.chief_complaint || 'a general consultation';
  const medsLines: string[] = [];
  for (const rx of prescriptions) {
    const meds = rx.medications as any[];
    if (meds?.length) {
      for (const m of meds) medsLines.push(`${m.name} ${m.dosage || ''} (${m.frequency || 'as directed'})`);
    }
  }

  return {
    summary_text: `Thank you for visiting today, ${patientName}. Your doctor reviewed your concerns regarding ${reason} and conducted a thorough assessment.${vitals ? ` Your vitals were recorded during the visit.` : ''} ${medsLines.length > 0 ? 'Medications have been prescribed to help with your condition.' : 'No new medications were needed at this time.'} Please follow the instructions below and don't hesitate to reach out if you have any questions.`,
    diagnosis: prescriptions[0]?.diagnosis || `Assessment for ${reason}`,
    medications_summary: medsLines.length > 0 ? medsLines.join('; ') : 'No new medications were prescribed.',
    follow_up_instructions: prescriptions[0]?.general_instructions || 'Follow up with your doctor if symptoms persist or worsen. Maintain a healthy diet and get adequate rest.',
  };
}
