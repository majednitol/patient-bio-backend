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
    const { token, record_id } = await req.json();

    if (!token || !record_id) {
      console.error("Missing required parameters");
      return new Response(
        JSON.stringify({ error: "Token and record_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Generating document URL for record:", record_id);

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from("access_tokens")
      .select("id, token, user_id, is_revoked, expires_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      console.error("Token not found:", tokenError);
      return new Response(
        JSON.stringify({ error: "invalid", message: "Token not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if revoked
    if (tokenData.is_revoked) {
      console.log("Token is revoked");
      return new Response(
        JSON.stringify({ error: "revoked", message: "Access has been revoked" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log("Token is expired");
      return new Response(
        JSON.stringify({ error: "expired", message: "Token has expired" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = tokenData.user_id;

    // Fetch the health record to verify ownership and get file path
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

    // Verify the record belongs to the token's user
    if (record.user_id !== userId) {
      console.error("Record does not belong to token user");
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Not authorized to access this record" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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
