import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { share_id } = await req.json();

    if (!share_id) {
      return new Response(
        JSON.stringify({ error: "share_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch share with include_clinical_records flag
    const { data: share, error: shareError } = await supabaseAdmin
      .from("patient_researcher_shares")
      .select("id, researcher_id, patient_id, is_anonymized, disease_category, status, expires_at, include_clinical_records")
      .eq("id", share_id)
      .eq("researcher_id", user.id)
      .single();

    if (shareError || !share) {
      return new Response(
        JSON.stringify({ error: "No valid share found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Share has expired" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patientId = share.patient_id;
    const isAnonymized = share.is_anonymized;
    const diseaseCategory = share.disease_category;
    const includeClinical = share.include_clinical_records === true;

    console.log(`Fetching patient data for researcher ${user.id}, patient ${patientId}, anonymized: ${isAnonymized}, clinical: ${includeClinical}`);

    // Fetch profile (only if not anonymized)
    let profile = null;
    let patientNotificationPrefs = null;
    let patientPushEnabled = true;

    if (!isAnonymized) {
      const { data: profileData } = await supabaseAdmin
        .from("user_profiles")
        .select("display_name, date_of_birth, gender, notification_push_enabled, notification_preferences")
        .eq("user_id", patientId)
        .single();
      profile = profileData ? { display_name: profileData.display_name, date_of_birth: profileData.date_of_birth, gender: profileData.gender } : null;
      patientNotificationPrefs = profileData?.notification_preferences as { data_access?: boolean } | null;
      patientPushEnabled = profileData?.notification_push_enabled !== false;
    }

    // Fetch health data
    const { data: healthData } = await supabaseAdmin
      .from("health_data")
      .select("blood_group, health_allergies, chronic_diseases, current_medications, previous_diseases")
      .eq("user_id", patientId)
      .single();

    // Fetch health records
    let recordsQuery = supabaseAdmin
      .from("health_records")
      .select("id, title, category, disease_category, file_url, record_date, uploaded_at, description")
      .eq("user_id", patientId)
      .order("uploaded_at", { ascending: false });

    if (diseaseCategory) {
      recordsQuery = recordsQuery.eq("disease_category", diseaseCategory);
    }

    const { data: records } = await recordsQuery;

    // Fetch clinical records if flag is set
    let clinicalRecords = null;
    let prescriptions = null;

    if (includeClinical) {
      const [bgRes, comorbRes, investRes, treatRes, careRes, compRes, rxRes] = await Promise.all([
        supabaseAdmin.from("patient_background_info")
          .select("primary_diagnosis, cancer_stage, functional_status, family_history, lifestyle_notes, occupation")
          .eq("user_id", patientId).maybeSingle(),
        supabaseAdmin.from("patient_comorbidities")
          .select("comorbidity_list, icd10_mappings, smoking_status, alcohol_consumption")
          .eq("user_id", patientId).maybeSingle(),
        supabaseAdmin.from("patient_clinical_investigations")
          .select("investigation_type, loinc_code, biomarker_results, has_abnormal_values, imaging_type, imaging_results, bp_systolic, bp_diastolic, bmi")
          .eq("user_id", patientId).maybeSingle(),
        supabaseAdmin.from("patient_running_treatments")
          .select("treatment_types, is_active, therapy_type, dialysis_status, dietary_intervention")
          .eq("user_id", patientId).maybeSingle(),
        supabaseAdmin.from("patient_care_team")
          .select("specialty")
          .eq("user_id", patientId),
        supabaseAdmin.from("patient_complications_status")
          .select("current_complications, icd10_mappings, treatment_response, follow_up_required")
          .eq("user_id", patientId).maybeSingle(),
        supabaseAdmin.from("prescriptions")
          .select("diagnosis, medications, instructions, is_active, created_at")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      clinicalRecords = {
        background: bgRes.data || null,
        comorbidities: comorbRes.data || null,
        investigations: investRes.data || null,
        treatments: treatRes.data || null,
        careTeam: careRes.data || [],
        complications: compRes.data || null,
      };

      prescriptions = (rxRes.data || []).map((rx: Record<string, unknown>) => ({
        diagnosis: rx.diagnosis,
        medications: Array.isArray(rx.medications) ? rx.medications : [],
        instructions: rx.instructions,
        is_active: rx.is_active,
        created_at: rx.created_at,
      }));
    }

    // Update share status to viewed if still pending
    if (share.status === "pending") {
      await supabaseAdmin
        .from("patient_researcher_shares")
        .update({ status: "viewed", viewed_at: new Date().toISOString() })
        .eq("id", share_id);
    }

    // Get researcher name for logging
    const { data: researcherProfile } = await supabaseAdmin
      .from("researcher_profiles")
      .select("full_name, institution")
      .eq("user_id", user.id)
      .single();

    const researcherName = researcherProfile?.full_name || "Researcher";
    const institution = researcherProfile?.institution || "";

    // Access logging (only if not anonymized)
    const userAgent = req.headers.get("user-agent") || null;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || null;

    if (!isAnonymized) {
      const { error: logError } = await supabaseAdmin.from("access_logs").insert({
        user_id: patientId,
        accessor_id: user.id,
        accessor_type: "researcher",
        accessor_name: researcherName,
        access_reason: `Viewed patient data for research (${diseaseCategory || "general"})`,
        accessed_at: new Date().toISOString(),
        user_agent: userAgent,
        ip_address: ipAddress,
      });

      if (logError) {
        console.error("Failed to create access log:", logError);
      }

      const shouldNotify = patientNotificationPrefs?.data_access !== false;

      if (shouldNotify) {
        const institutionText = institution ? ` from ${institution}` : "";
        await supabaseAdmin.from("notifications").insert({
          user_id: patientId,
          title: "Research Data Accessed",
          message: `${researcherName}${institutionText} accessed your health data for research purposes.`,
          type: "data_viewed",
          metadata: {
            accessor_id: user.id,
            accessor_type: "researcher",
            accessor_name: researcherName,
            disease_category: diseaseCategory,
            institution: institution,
          },
        });

        if (patientPushEnabled) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-access-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                user_id: patientId,
                title: "Research Data Accessed",
                body: `${researcherName}${institutionText} accessed your health data.`,
                url: "/dashboard/access-analytics",
              }),
            });
          } catch (pushError) {
            console.error("Error sending push notification:", pushError);
          }
        }
      }
    }

    // Fetch diagnostic center grades for pathologist reports linked to this patient
    const { data: pathReports } = await supabaseAdmin
      .from("pathologist_reports")
      .select("pathologist_id")
      .eq("patient_id", patientId);

    let diagnosticCenterGrades: Array<{ lab_name: string; lab_grade: string | null }> = [];
    if (pathReports && pathReports.length > 0) {
      const uniquePathIds = [...new Set(pathReports.map((r: any) => r.pathologist_id).filter(Boolean))];
      if (uniquePathIds.length > 0) {
        const { data: pathProfiles } = await supabaseAdmin
          .from("pathologist_profiles")
          .select("user_id, lab_name, full_name, lab_grade")
          .in("user_id", uniquePathIds);
        diagnosticCenterGrades = (pathProfiles || []).map((p: any) => ({
          lab_name: p.lab_name || p.full_name || "Unknown Lab",
          lab_grade: p.lab_grade,
        }));
      }
    }

    // Generate signed URLs for records
    const recordsWithUrls = await Promise.all(
      (records || []).map(async (record) => {
        const { data: signedUrlData } = await supabaseAdmin.storage
          .from("health-records")
          .createSignedUrl(record.file_url, 300);

        return {
          ...record,
          signed_url: signedUrlData?.signedUrl || null,
        };
      })
    );

    return new Response(
      JSON.stringify({
        profile,
        healthData: healthData || null,
        records: recordsWithUrls,
        isAnonymized,
        diseaseCategory,
        clinicalRecords,
        prescriptions,
        diagnosticCenterGrades,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" } }
    );
  } catch (error: unknown) {
    console.error("Error in get-patient-data-for-researcher:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
