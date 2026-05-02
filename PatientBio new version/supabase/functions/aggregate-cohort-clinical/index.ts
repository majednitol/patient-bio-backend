import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get all researcher's shared patient IDs
    const { data: shares } = await adminClient
      .from("patient_researcher_shares")
      .select("patient_id")
      .eq("researcher_id", user.id)
      .in("status", ["pending", "viewed", "completed"]);

    if (!shares || shares.length === 0) {
      return new Response(JSON.stringify({ summary: null, message: "No shared patients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patientIds = [...new Set(shares.map((s: any) => s.patient_id))];

    // Fetch clinical data in parallel
    const [bgRes, comRes, invRes, txRes] = await Promise.all([
      adminClient.from("patient_clinical_background").select("user_id, primary_diagnosis, icd10_code, bmi, smoking_status").in("user_id", patientIds),
      adminClient.from("patient_clinical_comorbidities").select("user_id, comorbidity_list, total_comorbidities").in("user_id", patientIds),
      adminClient.from("patient_clinical_investigations").select("user_id, has_abnormal_values, bp_systolic, bp_diastolic").in("user_id", patientIds),
      adminClient.from("patient_clinical_treatments").select("user_id, treatment_types, is_currently_treated").in("user_id", patientIds),
    ]);

    // Aggregate diagnoses
    const diagnosisCounts: Record<string, number> = {};
    (bgRes.data || []).forEach((r: any) => {
      if (r.primary_diagnosis) {
        const key = r.primary_diagnosis;
        diagnosisCounts[key] = (diagnosisCounts[key] || 0) + 1;
      }
    });

    // ICD-10 code frequency
    const icd10Counts: Record<string, number> = {};
    (bgRes.data || []).forEach((r: any) => {
      if (r.icd10_code) {
        const prefix = r.icd10_code.substring(0, 3);
        icd10Counts[prefix] = (icd10Counts[prefix] || 0) + 1;
      }
    });

    // Comorbidity prevalence
    const comorbidityPrevalence: Record<string, number> = {};
    let totalComorbidities = 0;
    (comRes.data || []).forEach((r: any) => {
      const list = r.comorbidity_list as string[] | null;
      if (list) {
        totalComorbidities += list.length;
        list.forEach((c: string) => {
          comorbidityPrevalence[c] = (comorbidityPrevalence[c] || 0) + 1;
        });
      }
    });

    // Treatment distribution
    const treatmentCounts: Record<string, number> = {};
    (txRes.data || []).forEach((r: any) => {
      const types = r.treatment_types as string[] | null;
      if (types) {
        types.forEach((t: string) => {
          treatmentCounts[t] = (treatmentCounts[t] || 0) + 1;
        });
      }
    });

    // Abnormal lab rate
    const totalInvestigations = (invRes.data || []).length;
    const abnormalCount = (invRes.data || []).filter((r: any) => r.has_abnormal_values).length;

    // BP ranges
    const bpValues = (invRes.data || [])
      .filter((r: any) => r.bp_systolic && r.bp_diastolic)
      .map((r: any) => ({ systolic: r.bp_systolic, diastolic: r.bp_diastolic }));

    const avgSystolic = bpValues.length > 0
      ? Math.round(bpValues.reduce((s: number, v: any) => s + v.systolic, 0) / bpValues.length)
      : null;
    const avgDiastolic = bpValues.length > 0
      ? Math.round(bpValues.reduce((s: number, v: any) => s + v.diastolic, 0) / bpValues.length)
      : null;

    // BMI
    const bmiValues = (bgRes.data || []).filter((r: any) => r.bmi).map((r: any) => r.bmi);
    const avgBmi = bmiValues.length > 0
      ? Math.round((bmiValues.reduce((s: number, v: number) => s + v, 0) / bmiValues.length) * 10) / 10
      : null;

    const summary = {
      totalPatients: patientIds.length,
      topDiagnoses: Object.entries(diagnosisCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      icd10Distribution: Object.entries(icd10Counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([code, count]) => ({ code, count })),
      comorbidityPrevalence: Object.entries(comorbidityPrevalence)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count, rate: Math.round((count / patientIds.length) * 100) })),
      avgComorbidityBurden: patientIds.length > 0 ? Math.round((totalComorbidities / patientIds.length) * 10) / 10 : 0,
      treatmentDistribution: Object.entries(treatmentCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count })),
      abnormalLabRate: totalInvestigations > 0 ? Math.round((abnormalCount / totalInvestigations) * 100) : 0,
      bloodPressure: { avgSystolic, avgDiastolic, sampleSize: bpValues.length },
      bmi: { average: avgBmi, sampleSize: bmiValues.length },
    };

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=300" },
    });
  } catch (error: unknown) {
    console.error("Error in aggregate-cohort-clinical:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
