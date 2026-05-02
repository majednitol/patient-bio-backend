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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { icd10Prefix, treatmentType, hasAbnormalLabs, comorbidityCount } = await req.json();

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get all share patient_ids for this researcher
    const { data: shares, error: sharesError } = await adminClient
      .from("patient_researcher_shares")
      .select("patient_id")
      .eq("researcher_id", user.id)
      .in("status", ["pending", "viewed", "completed"]);

    if (sharesError) throw sharesError;
    if (!shares || shares.length === 0) {
      return new Response(JSON.stringify({ matchingPatientIds: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patientIds = [...new Set(shares.map((s: any) => s.patient_id))];
    let matchingIds = new Set<string>(patientIds);

    // Filter by ICD-10 prefix (from patient_clinical_background)
    if (icd10Prefix && icd10Prefix.trim()) {
      const { data: bgData } = await adminClient
        .from("patient_clinical_background")
        .select("user_id, icd10_code")
        .in("user_id", patientIds)
        .ilike("icd10_code", `${icd10Prefix.trim()}%`);

      const icdMatches = new Set((bgData || []).map((r: any) => r.user_id));
      matchingIds = new Set([...matchingIds].filter((id) => icdMatches.has(id)));
    }

    // Filter by treatment type (from patient_clinical_treatments)
    if (treatmentType && treatmentType.trim()) {
      const { data: txData } = await adminClient
        .from("patient_clinical_treatments")
        .select("user_id, treatment_types")
        .in("user_id", [...matchingIds]);

      const txMatches = new Set(
        (txData || [])
          .filter((r: any) => {
            const types = r.treatment_types as string[] | null;
            return types && types.some((t: string) => t.toLowerCase().includes(treatmentType.toLowerCase()));
          })
          .map((r: any) => r.user_id)
      );
      matchingIds = new Set([...matchingIds].filter((id) => txMatches.has(id)));
    }

    // Filter by abnormal labs (from patient_clinical_investigations)
    if (hasAbnormalLabs === true) {
      const { data: labData } = await adminClient
        .from("patient_clinical_investigations")
        .select("user_id, has_abnormal_values")
        .in("user_id", [...matchingIds])
        .eq("has_abnormal_values", true);

      const labMatches = new Set((labData || []).map((r: any) => r.user_id));
      matchingIds = new Set([...matchingIds].filter((id) => labMatches.has(id)));
    }

    // Filter by comorbidity count (from patient_clinical_comorbidities)
    if (comorbidityCount && comorbidityCount !== "any") {
      const { data: comData } = await adminClient
        .from("patient_clinical_comorbidities")
        .select("user_id, comorbidity_list")
        .in("user_id", [...matchingIds]);

      const comMatches = new Set(
        (comData || [])
          .filter((r: any) => {
            const list = r.comorbidity_list as string[] | null;
            const count = list?.length || 0;
            if (comorbidityCount === "0") return count === 0;
            if (comorbidityCount === "1-2") return count >= 1 && count <= 2;
            if (comorbidityCount === "3+") return count >= 3;
            return true;
          })
          .map((r: any) => r.user_id)
      );
      // For "0" we also need patients with no comorbidity record
      if (comorbidityCount === "0") {
        const hasRecord = new Set((comData || []).map((r: any) => r.user_id));
        [...matchingIds].forEach((id) => {
          if (!hasRecord.has(id)) comMatches.add(id);
        });
      }
      matchingIds = new Set([...matchingIds].filter((id) => comMatches.has(id)));
    }

    return new Response(
      JSON.stringify({ matchingPatientIds: [...matchingIds] }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in filter-cohort-clinical:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
