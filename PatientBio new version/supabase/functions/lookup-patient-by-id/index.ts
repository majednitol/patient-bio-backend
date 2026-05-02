import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header to verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { patient_code } = await req.json();

    if (!patient_code || typeof patient_code !== "string") {
      return new Response(
        JSON.stringify({ error: "Patient code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedCode = patient_code.trim();
    console.log(`Looking up patient with code: ${trimmedCode}`);

    let patient: { user_id: string; display_name: string | null; date_of_birth: string | null; gender: string | null } | null = null;

    // Check if it's a Global Health Passport ID (format: PB-YYYYMM-XXXXXX-C)
    if (trimmedCode.startsWith("PB-")) {
      // Search by patient_passport_id (indexed, O(1) lookup)
      const { data: passportMatch, error: passportError } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, date_of_birth, gender")
        .eq("patient_passport_id", trimmedCode)
        .maybeSingle();

      if (passportError) {
        console.error("Error searching by passport ID:", passportError);
        return new Response(
          JSON.stringify({ error: "Failed to search for patient" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      patient = passportMatch;
    } else {
      // Legacy lookup: UUID prefix (for backwards compatibility)
      const normalizedCode = trimmedCode.toLowerCase();

      if (normalizedCode.length < 4 || normalizedCode.length > 36) {
        return new Response(
          JSON.stringify({ found: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, date_of_birth, gender");

      if (profileError) {
        console.error("Error searching for patient:", profileError);
        return new Response(
          JSON.stringify({ error: "Failed to search for patient" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Filter profiles where user_id starts with the patient code (case-insensitive)
      const matchingProfiles = profiles?.filter((p) =>
        p.user_id.toLowerCase().startsWith(normalizedCode)
      ) || [];

      patient = matchingProfiles.length > 0 ? matchingProfiles[0] : null;
    }

    if (!patient) {
      console.log("No patient found with code:", trimmedCode);
      return new Response(
        JSON.stringify({ found: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate age if date_of_birth is available
    let age: number | null = null;
    if (patient.date_of_birth) {
      const birthDate = new Date(patient.date_of_birth);
      const today = new Date();
      age = Math.floor(
        (today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
    }

    // Check if the doctor already has access to this patient
    const { data: existingAccess, error: accessError } = await supabase
      .from("doctor_patient_access")
      .select("id, is_active")
      .eq("doctor_id", user.id)
      .eq("patient_id", patient.user_id)
      .maybeSingle();

    if (accessError) {
      console.error("Error checking existing access:", accessError);
    }

    console.log("Patient found:", patient.user_id);

    return new Response(
      JSON.stringify({
        found: true,
        patient_id: patient.user_id,
        display_name: patient.display_name || "Unknown",
        gender: patient.gender,
        age,
        already_connected: existingAccess?.is_active === true,
        has_inactive_access: existingAccess && !existingAccess.is_active,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=30" } }
    );
  } catch (error) {
    console.error("Error in lookup-patient-by-id:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
