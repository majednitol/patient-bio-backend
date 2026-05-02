import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user auth to verify access
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.log("Invalid JWT claims:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log("Authenticated user:", userId);

    // Get patient_id from request body
    const { patient_id } = await req.json();
    if (!patient_id) {
      return new Response(
        JSON.stringify({ error: "Missing patient_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the doctor has access to this patient
    const { data: access, error: accessError } = await supabaseUser
      .from("doctor_patient_access")
      .select("id")
      .eq("doctor_id", userId)
      .eq("patient_id", patient_id)
      .eq("is_active", true)
      .maybeSingle();

    if (accessError || !access) {
      return new Response(
        JSON.stringify({ error: "No access to this patient" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to fetch patient data
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch patient profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("display_name, date_of_birth, gender, location, phone, avatar_url, notification_push_enabled, notification_preferences")
      .eq("user_id", patient_id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    // Fetch health data
    const { data: healthData, error: healthError } = await supabaseAdmin
      .from("health_data")
      .select("user_id, blood_group, height, weight, chronic_diseases, previous_diseases, health_allergies, current_medications, emergency_contact_name, emergency_contact_phone")
      .eq("user_id", patient_id)
      .maybeSingle();

    if (healthError) {
      console.error("Error fetching health data:", healthError);
    }

    // Fetch health records
    const { data: records, error: recordsError } = await supabaseAdmin
      .from("health_records")
      .select("id, title, category, record_date, provider_name, file_type, disease_category")
      .eq("user_id", patient_id)
      .order("record_date", { ascending: false })
      .limit(20);

    if (recordsError) {
      console.error("Error fetching records:", recordsError);
    }

    // Update last accessed timestamp
    await supabaseAdmin
      .from("doctor_patient_access")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("doctor_id", userId)
      .eq("patient_id", patient_id);

    // Get doctor's name for logging
    const { data: doctorProfile } = await supabaseAdmin
      .from("doctor_profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single();

    const rawName = doctorProfile?.full_name || "";
    const doctorName = rawName ? (rawName.startsWith("Dr.") || rawName.startsWith("Dr ") ? rawName : `Dr. ${rawName}`) : "Doctor";

    // Get request metadata for access logging
    const userAgent = req.headers.get("user-agent") || null;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || null;

    // Create access log entry
    const { error: logError } = await supabaseAdmin.from("access_logs").insert({
      user_id: patient_id,
      accessor_id: userId,
      accessor_type: "doctor",
      accessor_name: doctorName,
      access_reason: "Viewed patient health data via doctor portal",
      accessed_at: new Date().toISOString(),
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    if (logError) {
      console.error("Failed to create access log:", logError);
    } else {
      console.log("Access log created for doctor viewing patient data");
    }

    // Check patient's notification preferences
    const notificationPrefs = profile?.notification_preferences as { data_access?: boolean } | null;
    const shouldNotify = notificationPrefs?.data_access !== false;

    if (shouldNotify) {
      // Create in-app notification for patient
      const { error: notifError } = await supabaseAdmin.from("notifications").insert({
        user_id: patient_id,
        title: "Health Data Accessed",
        message: `${doctorName} viewed your health records via the doctor portal.`,
        type: "data_viewed",
        metadata: {
          accessor_id: userId,
          accessor_type: "doctor",
          accessor_name: doctorName,
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
              body: `${doctorName} viewed your health records.`,
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

    return new Response(
      JSON.stringify({
        profile: profile || null,
        healthData: healthData || null,
        records: records || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Error in get-patient-data-for-doctor:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
