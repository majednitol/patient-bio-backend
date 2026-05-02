import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_SHARES = 500;

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

    const { shareIds, includeProfile, includeHealthData, includeClinicalRecords, includePrescriptions } = await req.json();

    if (!Array.isArray(shareIds) || shareIds.length === 0) {
      return new Response(JSON.stringify({ error: "shareIds array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (shareIds.length > MAX_SHARES) {
      return new Response(JSON.stringify({ error: `Maximum ${MAX_SHARES} shares per request` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify researcher owns these shares
    const { data: shares, error: sharesError } = await adminClient
      .from("patient_researcher_shares")
      .select("id, patient_id, is_anonymized, disease_category, status, shared_at, include_clinical_records")
      .eq("researcher_id", user.id)
      .in("id", shareIds);

    if (sharesError) throw sharesError;
    if (!shares || shares.length === 0) {
      return new Response(JSON.stringify({ error: "No valid shares found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patientIds = [...new Set(shares.map((s: any) => s.patient_id))];

    // Fetch all data in parallel
    const queries: Promise<any>[] = [];

    // Profile data
    if (includeProfile) {
      queries.push(
        adminClient.from("user_profiles").select("user_id, display_name, date_of_birth, gender").in("user_id", patientIds)
      );
    } else {
      queries.push(Promise.resolve({ data: [] }));
    }

    // Health data
    if (includeHealthData) {
      queries.push(
        adminClient.from("health_data_summaries").select("user_id, blood_group, health_allergies, chronic_diseases, current_medications, previous_diseases").in("user_id", patientIds)
      );
    } else {
      queries.push(Promise.resolve({ data: [] }));
    }

    // Clinical records (6 tables)
    if (includeClinicalRecords) {
      queries.push(
        adminClient.from("patient_clinical_background").select("*").in("user_id", patientIds),
        adminClient.from("patient_clinical_comorbidities").select("*").in("user_id", patientIds),
        adminClient.from("patient_clinical_investigations").select("*").in("user_id", patientIds),
        adminClient.from("patient_clinical_treatments").select("*").in("user_id", patientIds),
        adminClient.from("patient_clinical_care_team").select("*").in("user_id", patientIds),
        adminClient.from("patient_clinical_complications").select("*").in("user_id", patientIds),
      );
    } else {
      queries.push(...Array(6).fill(Promise.resolve({ data: [] })));
    }

    // Prescriptions
    if (includePrescriptions) {
      queries.push(
        adminClient.from("prescriptions").select("*").in("patient_id", patientIds)
      );
    } else {
      queries.push(Promise.resolve({ data: [] }));
    }

    const [profileRes, healthRes, bgRes, comRes, invRes, txRes, ctRes, compRes, rxRes] = await Promise.all(queries);

    // Index by patient_id
    const index = (arr: any[], key = "user_id") => {
      const map: Record<string, any[]> = {};
      (arr || []).forEach((r: any) => {
        const k = r[key];
        if (!map[k]) map[k] = [];
        map[k].push(r);
      });
      return map;
    };

    const profileMap = index(profileRes.data || []);
    const healthMap = index(healthRes.data || []);
    const bgMap = index(bgRes.data || []);
    const comMap = index(comRes.data || []);
    const invMap = index(invRes.data || []);
    const txMap = index(txRes.data || []);
    const ctMap = index(ctRes.data || []);
    const compMap = index(compRes.data || []);
    const rxMap = index(rxRes.data || [], "patient_id");

    // Build export
    const results = shares.map((share: any) => {
      const pid = share.patient_id;
      const entry: Record<string, any> = {
        shareId: share.id,
        patientId: share.is_anonymized ? `ANON-${pid.substring(0, 8)}` : pid,
        isAnonymized: share.is_anonymized,
        diseaseCategory: share.disease_category || "general",
        status: share.status,
        sharedAt: share.shared_at,
      };

      if (includeProfile && !share.is_anonymized) {
        entry.profile = (profileMap[pid] || [])[0] || null;
      }
      if (includeHealthData) {
        entry.healthData = (healthMap[pid] || [])[0] || null;
      }
      if (includeClinicalRecords) {
        entry.clinicalRecords = {
          background: (bgMap[pid] || [])[0] || null,
          comorbidities: (comMap[pid] || [])[0] || null,
          investigations: (invMap[pid] || [])[0] || null,
          treatments: (txMap[pid] || [])[0] || null,
          careTeam: ctMap[pid] || [],
          complications: (compMap[pid] || [])[0] || null,
        };
      }
      if (includePrescriptions) {
        entry.prescriptions = rxMap[pid] || [];
      }

      return entry;
    });

    return new Response(JSON.stringify({ data: results, count: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in bulk-research-export:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
