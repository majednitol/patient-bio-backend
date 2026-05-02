import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { share_id, patient_id } = await req.json();

    if (!share_id || !patient_id) {
      return new Response(
        JSON.stringify({ error: "share_id and patient_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for database queries
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the pathologist has an active share for this patient
    const { data: share, error: shareError } = await supabaseAdmin
      .from("doctor_pathologist_shares")
      .select("id, doctor_id, pathologist_id, patient_id, disease_category, status, shared_at")
      .eq("id", share_id)
      .eq("pathologist_id", user.id)
      .eq("patient_id", patient_id)
      .single();

    if (shareError || !share) {
      console.error("Share verification failed:", shareError);
      return new Response(
        JSON.stringify({ error: "No valid share found for this patient" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching patient data for pathologist ${user.id}, patient ${patient_id}`);

    // Fetch patient profile with notification preferences
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("display_name, date_of_birth, gender, notification_push_enabled, notification_preferences")
      .eq("user_id", patient_id)
      .single();

    // Fetch patient health data
    const { data: healthData } = await supabaseAdmin
      .from("health_data")
      .select("blood_group, health_allergies, chronic_diseases, current_medications")
      .eq("user_id", patient_id)
      .single();

    // Fetch health records - filter by disease category if specified
    let recordsQuery = supabaseAdmin
      .from("health_records")
      .select("id, title, category, disease_category, file_url, record_date, uploaded_at")
      .eq("user_id", patient_id)
      .order("uploaded_at", { ascending: false });

    if (share.disease_category) {
      recordsQuery = recordsQuery.eq("disease_category", share.disease_category);
    }

    const { data: records } = await recordsQuery;

    // Update share status to viewed if still pending
    if (share.status === "pending") {
      await supabaseAdmin
        .from("doctor_pathologist_shares")
        .update({ status: "viewed" })
        .eq("id", share_id);
    }

    // Get pathologist name for logging
    const { data: pathologistProfile } = await supabaseAdmin
      .from("pathologist_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const pathologistName = pathologistProfile?.full_name || "Pathologist";

    // Get request metadata for access logging
    const userAgent = req.headers.get("user-agent") || null;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || null;

    // Create access log entry
    const { error: logError } = await supabaseAdmin.from("access_logs").insert({
      user_id: patient_id,
      accessor_id: user.id,
      accessor_type: "pathologist",
      accessor_name: pathologistName,
      access_reason: `Viewed patient data via referral (${share.disease_category || "general"})`,
      accessed_at: new Date().toISOString(),
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    if (logError) {
      console.error("Failed to create access log:", logError);
    } else {
      console.log("Access log created for pathologist viewing patient data");
    }

    // Check patient's notification preferences
    const notificationPrefs = profile?.notification_preferences as { data_access?: boolean } | null;
    const shouldNotify = notificationPrefs?.data_access !== false;

    if (shouldNotify) {
      // Create in-app notification for patient
      const { error: notifError } = await supabaseAdmin.from("notifications").insert({
        user_id: patient_id,
        title: "Health Data Accessed",
        message: `${pathologistName} viewed your health records via a doctor referral.`,
        type: "data_viewed",
        metadata: {
          accessor_id: user.id,
          accessor_type: "pathologist",
          accessor_name: pathologistName,
          disease_category: share.disease_category,
        },
      });

      if (notifError) {
        console.error("Failed to create notification:", notifError);
      } else {
        console.log("In-app notification created for patient");
      }

      // Trigger push notification if enabled
      if (profile?.notification_push_enabled !== false) {
        try {
          const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-access-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              user_id: patient_id,
              title: "Health Data Accessed",
              body: `${pathologistName} viewed your health records.`,
              url: "/dashboard/access-analytics",
            }),
          });

          if (!pushResponse.ok) {
            console.error("Push notification failed:", await pushResponse.text());
          } else {
            console.log("Push notification sent successfully");
          }
        } catch (pushError) {
          console.error("Error sending push notification:", pushError);
        }
      }
    }

    console.log(`Returning ${records?.length || 0} records for patient ${patient_id}`);

    return new Response(
      JSON.stringify({
        profile: profile ? { display_name: profile.display_name, date_of_birth: profile.date_of_birth, gender: profile.gender } : null,
        healthData: healthData || null,
        records: records || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, no-store" } }
    );
  } catch (error: unknown) {
    console.error("Error in get-patient-data-for-pathologist:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
