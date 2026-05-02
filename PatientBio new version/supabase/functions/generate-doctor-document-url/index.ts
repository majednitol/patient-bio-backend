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
    const { record_id } = await req.json();

    if (!record_id) {
      console.error("Missing record_id parameter");
      return new Response(
        JSON.stringify({ error: "record_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Doctor requesting document URL for record:", record_id);

    // Create Supabase client with user's auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Not authenticated" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user token to get their identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Invalid authentication" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const doctorId = user.id;
    console.log("Doctor ID:", doctorId);

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the health record to get patient ID and file path
    const { data: record, error: recordError } = await supabase
      .from("health_records")
      .select("id, file_url, user_id, title, file_type")
      .eq("id", record_id)
      .single();

    if (recordError || !record) {
      console.error("Record not found:", recordError);
      return new Response(
        JSON.stringify({ error: "not_found", message: "Record not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Record found, patient ID:", record.user_id);

    // Verify the doctor has active access to this patient
    const { data: access, error: accessError } = await supabase
      .from("doctor_patient_access")
      .select("id, is_active")
      .eq("doctor_id", doctorId)
      .eq("patient_id", record.user_id)
      .eq("is_active", true)
      .single();

    if (accessError || !access) {
      console.error("Doctor does not have access to this patient:", accessError);
      return new Response(
        JSON.stringify({ error: "forbidden", message: "You do not have access to this patient's records" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Access verified, generating signed URL");

    // Generate a short-lived signed URL (5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("health-records")
      .createSignedUrl(record.file_url, 300); // 300 seconds = 5 minutes

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Failed to generate signed URL:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "storage_error", message: "Failed to generate document URL" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Successfully generated signed URL for record:", record.title);

    return new Response(
      JSON.stringify({
        url: signedUrlData.signedUrl,
        expires_in: 300,
        title: record.title,
        file_type: record.file_type,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=240" },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "internal", message: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
