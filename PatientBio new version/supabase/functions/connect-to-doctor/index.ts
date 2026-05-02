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
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get the authorization header to identify the patient
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to get their ID
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patientId = user.id;
    console.log("Patient ID:", patientId);

    // Parse request body
    const { doctor_code } = await req.json();
    if (!doctor_code || typeof doctor_code !== "string") {
      return new Response(
        JSON.stringify({ error: "Doctor code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedCode = doctor_code.toLowerCase().trim();
    console.log("Looking up doctor code:", normalizedCode);

    // Use service role to query doctor profiles
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch all doctors and filter in JS (since UUID can't use ilike directly)
    // The 8-character code is the first segment of the UUID
    const { data: allDoctors, error: doctorError } = await supabaseAdmin
      .from("doctor_profiles")
      .select("user_id, full_name, specialty, avatar_url, is_verified");

    if (doctorError) {
      console.error("Error finding doctor:", doctorError);
      return new Response(
        JSON.stringify({ error: "Failed to lookup doctor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find doctor where user_id starts with the code
    const doctors = (allDoctors || []).filter(d => 
      d.user_id.toLowerCase().startsWith(normalizedCode)
    );

    if (!doctors || doctors.length === 0) {
      console.log("No doctor found with code:", normalizedCode);
      return new Response(
        JSON.stringify({ error: "No doctor found with this ID" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const doctor = doctors[0];
    console.log("Found doctor:", doctor.full_name);

    // Check if patient is trying to connect to themselves
    if (doctor.user_id === patientId) {
      return new Response(
        JSON.stringify({ error: "You cannot connect to yourself" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if access already exists
    const { data: existingAccess, error: accessError } = await supabaseAdmin
      .from("doctor_patient_access")
      .select("id, is_active")
      .eq("doctor_id", doctor.user_id)
      .eq("patient_id", patientId)
      .maybeSingle();

    if (accessError) {
      console.error("Error checking existing access:", accessError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing access" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingAccess) {
      if (existingAccess.is_active) {
        return new Response(
          JSON.stringify({ 
            error: "You are already connected with this doctor",
            doctor: {
              id: doctor.user_id,
              full_name: doctor.full_name,
              specialty: doctor.specialty,
              avatar_url: doctor.avatar_url,
            }
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Reactivate existing access
      const { error: updateError } = await supabaseAdmin
        .from("doctor_patient_access")
        .update({ is_active: true, granted_at: new Date().toISOString() })
        .eq("id", existingAccess.id);

      if (updateError) {
        console.error("Error reactivating access:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to reactivate connection" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Reactivated access for patient", patientId, "to doctor", doctor.user_id);
    } else {
      // Create new access record
      const { error: insertError } = await supabaseAdmin
        .from("doctor_patient_access")
        .insert({
          doctor_id: doctor.user_id,
          patient_id: patientId,
          is_active: true,
          granted_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error creating access:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create connection" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Created new access for patient", patientId, "to doctor", doctor.user_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        doctor: {
          id: doctor.user_id,
          full_name: doctor.full_name,
          specialty: doctor.specialty,
          avatar_url: doctor.avatar_url,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
