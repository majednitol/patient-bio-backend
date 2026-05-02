import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { categories, jurisdiction } = await req.json();

    // Fetch patient profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, date_of_birth, gender, blood_group')
      .eq('user_id', user.id)
      .single();

    // Fetch health records based on selected categories
    const anonymizedData: Record<string, unknown> = {};
    const diseaseCategories: string[] = [];

    if (categories.includes('prescriptions')) {
      const { data: prescriptions } = await supabase
        .from('prescriptions')
        .select('diagnosis, medications, instructions, is_active, created_at')
        .eq('patient_id', user.id)
        .limit(100);

      if (prescriptions?.length) {
        const parsedMeds: Array<Record<string, unknown>> = [];
        prescriptions.forEach(p => {
          // Parse JSONB medications array
          const medsArray = Array.isArray(p.medications) ? p.medications : [];
          for (const med of medsArray) {
            const m = med as Record<string, string>;
            parsedMeds.push({
              medication_class: m.name || 'Unknown',
              dosage_range: m.dosage || null,
              frequency: m.frequency || null,
              category: p.diagnosis || null,
            });
          }
          // Derive disease categories from diagnosis
          if (p.diagnosis && !diseaseCategories.includes(p.diagnosis)) {
            diseaseCategories.push(p.diagnosis);
          }
        });
        if (parsedMeds.length > 0) {
          anonymizedData.medications = parsedMeds;
        }
      }
    }

    if (categories.includes('diagnoses')) {
      const { data: records } = await supabase
        .from('health_records')
        .select('title, category, disease_category, uploaded_at')
        .eq('user_id', user.id)
        .limit(100);

      if (records?.length) {
        anonymizedData.diagnoses = records.map(r => ({
          category: r.category,
          disease_category: r.disease_category,
        }));
        records.forEach(r => {
          if (r.disease_category && !diseaseCategories.includes(r.disease_category)) {
            diseaseCategories.push(r.disease_category);
          }
        });
      }
    }

    if (categories.includes('vitals')) {
      const { data: vitals } = await supabase
        .from('health_records')
        .select('category, uploaded_at')
        .eq('user_id', user.id)
        .eq('category', 'vitals')
        .limit(50);

      if (vitals?.length) {
        anonymizedData.vitals_count = vitals.length;
      }
    }

    if (categories.includes('demographics')) {
      anonymizedData.demographics = {
        gender: profile?.gender || 'unknown',
        blood_group: profile?.blood_group || 'unknown',
      };
    }

    // Clinical Records: fetch all 6 tables in parallel, strip PII
    if (categories.includes('clinical_records')) {
      const [bgRes, comorbRes, investRes, treatRes, careRes, compRes] = await Promise.all([
        supabase.from('patient_background_info').select('family_history, lifestyle_notes, occupation').eq('user_id', user.id).maybeSingle(),
        supabase.from('patient_comorbidities').select('comorbidity_list, icd10_mappings, smoking_status, alcohol_consumption').eq('user_id', user.id).maybeSingle(),
        supabase.from('patient_clinical_investigations').select('investigation_type, loinc_code, biomarker_results, has_abnormal_values, imaging_type, bp_systolic, bp_diastolic, bmi').eq('user_id', user.id).maybeSingle(),
        supabase.from('patient_running_treatments').select('treatment_types, is_active, therapy_type, dialysis_status, dietary_intervention').eq('user_id', user.id).maybeSingle(),
        supabase.from('patient_care_team').select('specialty').eq('user_id', user.id),
        supabase.from('patient_complications_status').select('current_complications, icd10_mappings, treatment_response, follow_up_required').eq('user_id', user.id).maybeSingle(),
      ]);

      const clinicalRecords: Record<string, unknown> = {};
      let clinicalTableCount = 0;

      if (bgRes.data) {
        clinicalRecords.background = {
          family_history: bgRes.data.family_history,
          lifestyle_notes: bgRes.data.lifestyle_notes,
          occupation: bgRes.data.occupation,
        };
        clinicalTableCount++;
      }
      if (comorbRes.data) {
        clinicalRecords.comorbidities = {
          comorbidity_list: comorbRes.data.comorbidity_list,
          icd10_mappings: comorbRes.data.icd10_mappings,
          smoking_status: comorbRes.data.smoking_status,
          alcohol_consumption: comorbRes.data.alcohol_consumption,
        };
        clinicalTableCount++;
      }
      if (investRes.data) {
        const inv = investRes.data;
        const roundBP = (v: number | null) => v ? Math.round(v / 10) * 10 : null;
        const roundBMI = (v: number | null) => v ? Math.floor(v / 5) * 5 + '-' + (Math.floor(v / 5) * 5 + 5) : null;
        clinicalRecords.investigations = {
          investigation_type: inv.investigation_type,
          loinc_code: inv.loinc_code,
          biomarker_results: inv.biomarker_results,
          has_abnormal_values: inv.has_abnormal_values,
          imaging_type: inv.imaging_type,
          bp_range: inv.bp_systolic ? `${roundBP(inv.bp_systolic)}/${roundBP(inv.bp_diastolic)}` : null,
          bmi_range: roundBMI(inv.bmi),
        };
        clinicalTableCount++;
      }
      if (treatRes.data) {
        clinicalRecords.treatments = {
          treatment_types: treatRes.data.treatment_types,
          is_active: treatRes.data.is_active,
          therapy_type: treatRes.data.therapy_type,
          dialysis_status: treatRes.data.dialysis_status,
          dietary_intervention: treatRes.data.dietary_intervention,
        };
        clinicalTableCount++;
      }
      if (careRes.data && careRes.data.length > 0) {
        clinicalRecords.care_team = careRes.data.map((c: { specialty: string }) => ({
          specialty: c.specialty,
        }));
        clinicalTableCount++;
      }
      if (compRes.data) {
        clinicalRecords.complications = {
          current_complications: compRes.data.current_complications,
          icd10_mappings: compRes.data.icd10_mappings,
          treatment_response: compRes.data.treatment_response,
          follow_up_required: compRes.data.follow_up_required,
        };
        clinicalTableCount++;
      }

      if (Object.keys(clinicalRecords).length > 0) {
        anonymizedData.clinical_records = clinicalRecords;
        (anonymizedData as Record<string, unknown>)._clinical_table_count = clinicalTableCount;
      }
    }

    // Calculate age range from DOB
    let ageRange = 'unknown';
    if (profile?.date_of_birth) {
      const dob = new Date(profile.date_of_birth);
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const lower = Math.floor(age / 10) * 10;
      ageRange = `${lower}-${lower + 10}`;
    }

    // Use AI to classify medications into drug classes
    const geminiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (geminiKey && anonymizedData.medications) {
      try {
        const meds = (anonymizedData.medications as Array<{ medication_class: string }>).map(m => m.medication_class);
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Classify these medications into their pharmacological drug classes. Return ONLY a JSON object mapping medication name to drug class. Medications: ${JSON.stringify(meds)}` }] }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
            }),
          }
        );
        const geminiData = await geminiResponse.json();
        const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const classMap = JSON.parse(jsonMatch[0]);
          (anonymizedData.medications as Array<{ medication_class: string }>).forEach(m => {
            if (classMap[m.medication_class]) {
              m.medication_class = classMap[m.medication_class];
            }
          });
        }
      } catch (e) {
        console.error('AI classification failed, using raw names:', e);
      }
    }

    // Generate contribution hash
    const encoder = new TextEncoder();
    const hashData = encoder.encode(JSON.stringify({ userId: user.id, categories, data: anonymizedData, timestamp: new Date().toISOString().slice(0, 10) }));
    const hashBuffer = await crypto.subtle.digest('SHA-256', hashData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contributionHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Determine if cross-border approval needed
    const sourceJurisdiction = jurisdiction || 'BD';
    const requiresGovt = sourceJurisdiction !== 'BD';

    // ---- Quality Score Calculation ----
    let qualityScore = 0;

    // 1. Record count per category (max 30 pts)
    const medsCount = Array.isArray(anonymizedData.medications) ? (anonymizedData.medications as unknown[]).length : 0;
    const diagCount = Array.isArray(anonymizedData.diagnoses) ? (anonymizedData.diagnoses as unknown[]).length : 0;
    const vitalsCount = typeof anonymizedData.vitals_count === 'number' ? anonymizedData.vitals_count : 0;
    const totalRecords = medsCount + diagCount + vitalsCount;
    qualityScore += Math.min(Math.floor(totalRecords / 2) * 3, 30);

    // 2. Disease category diversity (max 20 pts)
    qualityScore += Math.min(diseaseCategories.length * 5, 20);

    // 3. Category breadth (max 25 pts)
    qualityScore += Math.min(categories.length * 5, 25);

    // 4. Demographic completeness (max 15 pts)
    if (anonymizedData.demographics) {
      const demo = anonymizedData.demographics as Record<string, string>;
      if (demo.gender && demo.gender !== 'unknown') qualityScore += 5;
      if (demo.blood_group && demo.blood_group !== 'unknown') qualityScore += 5;
    }
    if (ageRange !== 'unknown') qualityScore += 5;

    // 5. Temporal depth bonus (max 10 pts)
    if (totalRecords >= 10) qualityScore += 10;
    else if (totalRecords >= 5) qualityScore += 5;

    // 6. Clinical depth bonus (max 10 pts)
    const clinicalTableCount = typeof (anonymizedData as Record<string, unknown>)._clinical_table_count === 'number'
      ? (anonymizedData as Record<string, unknown>)._clinical_table_count as number : 0;
    if (clinicalTableCount >= 3) qualityScore += 10;
    else if (clinicalTableCount >= 1) qualityScore += 5;
    // Clean up internal field
    delete (anonymizedData as Record<string, unknown>)._clinical_table_count;

    qualityScore = Math.min(qualityScore, 100);

    return new Response(JSON.stringify({
      anonymized_data: anonymizedData,
      data_categories: categories,
      disease_categories: diseaseCategories,
      age_range: ageRange,
      gender: profile?.gender || 'unknown',
      source_jurisdiction: sourceJurisdiction,
      contribution_hash: contributionHash,
      requires_govt_approval: requiresGovt,
      govt_approval_status: requiresGovt ? 'pending' : 'not_required',
      quality_score: qualityScore,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Anonymization error:', error);
    return new Response(JSON.stringify({ error: 'Failed to anonymize data' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
