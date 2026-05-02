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

    const { shareIds } = await req.json();
    if (!Array.isArray(shareIds) || shareIds.length === 0) {
      return new Response(JSON.stringify({ error: "shareIds array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get shares belonging to this researcher
    const { data: shares } = await adminClient
      .from("patient_researcher_shares")
      .select("id, patient_id, include_clinical_records")
      .eq("researcher_id", user.id)
      .in("id", shareIds);

    if (!shares || shares.length === 0) {
      return new Response(JSON.stringify({ completeness: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patientIds = shares.map((s: any) => s.patient_id);

    // Batch queries in parallel
    const [healthRes, recordsRes, bgRes, rxRes] = await Promise.all([
      adminClient.from("health_data_summaries").select("user_id").in("user_id", patientIds),
      adminClient.from("health_records").select("user_id").in("user_id", patientIds),
      adminClient.from("patient_clinical_background").select("user_id").in("user_id", patientIds),
      adminClient.from("prescriptions").select("patient_id, is_active").in("patient_id", patientIds),
    ]);

    const healthSet = new Set((healthRes.data || []).map((r: any) => r.user_id));
    
    // Count records per patient
    const recordsCounts: Record<string, number> = {};
    (recordsRes.data || []).forEach((r: any) => {
      recordsCounts[r.user_id] = (recordsCounts[r.user_id] || 0) + 1;
    });

    const clinicalSet = new Set((bgRes.data || []).map((r: any) => r.user_id));

    const rxCounts: Record<string, number> = {};
    (rxRes.data || []).forEach((r: any) => {
      if (r.is_active) rxCounts[r.patient_id] = (rxCounts[r.patient_id] || 0) + 1;
    });

    const completeness: Record<string, {
      hasHealthData: boolean;
      recordsCount: number;
      hasClinicalRecords: boolean;
      prescriptionCount: number;
    }> = {};

    for (const share of shares) {
      const pid = share.patient_id;
      completeness[share.id] = {
        hasHealthData: healthSet.has(pid),
        recordsCount: recordsCounts[pid] || 0,
        hasClinicalRecords: clinicalSet.has(pid),
        prescriptionCount: rxCounts[pid] || 0,
      };
    }

    return new Response(JSON.stringify({ completeness }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=120" },
    });
  } catch (error: unknown) {
    console.error("Error in check-share-completeness:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
