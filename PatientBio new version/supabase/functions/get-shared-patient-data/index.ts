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
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokenData, error: tokenError } = await supabase
      .from("access_tokens")
      .select("id, user_id, token, expires_at, is_revoked, label, shared_scopes, access_count, accessed_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: "invalid", message: "Token not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tokenData.is_revoked) {
      return new Response(
        JSON.stringify({ error: "revoked", message: "Access has been revoked" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "expired", message: "Token has expired", expires_at: tokenData.expires_at }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = tokenData.user_id;
    const newAccessCount = (tokenData.access_count || 0) + 1;
    const scopes = tokenData.shared_scopes || { all: true };

    const userAgent = req.headers.get("user-agent") || null;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || null;

    // Update access tracking
    await supabase
      .from("access_tokens")
      .update({ accessed_at: new Date().toISOString(), access_count: newAccessCount })
      .eq("id", tokenData.id);

    // Create access log
    supabase.from("access_logs").insert({
      user_id: userId,
      access_token_id: tokenData.id,
      accessor_type: "provider",
      accessor_name: tokenData.label || "Healthcare Provider",
      access_reason: "Viewed shared health data via access token",
      accessed_at: new Date().toISOString(),
      user_agent: userAgent,
      ip_address: ipAddress,
    }).then(() => {});

    // Trigger notification (fire and forget)
    const notificationUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-access-notification`;
    fetch(notificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ token_id: tokenData.id, user_id: userId, access_count: newAccessCount }),
    }).catch((err) => console.error("Failed to trigger notification:", err));

    // Determine what to fetch based on scopes
    const shareAll = scopes.all === true;
    const includeProfile = shareAll || scopes.profile;
    const includeHealth = shareAll || scopes.health_summary || scopes.allergies || scopes.medications;
    const includeRecords = shareAll || scopes.records;
    const includeEmergency = shareAll || scopes.emergency_contact;

    // Fetch data in parallel based on scopes
    const promises: Promise<any>[] = [];

    if (includeProfile) {
      promises.push(supabase.from("user_profiles").select("user_id, display_name, date_of_birth, gender, location, phone, avatar_url").eq("user_id", userId).single());
    } else {
      promises.push(Promise.resolve({ data: null }));
    }

    if (includeHealth) {
      promises.push(supabase.from("health_data").select("user_id, blood_group, height, chronic_diseases, previous_diseases, health_allergies, current_medications, emergency_contact_name, emergency_contact_phone").eq("user_id", userId).single());
    } else {
      promises.push(Promise.resolve({ data: null }));
    }

    if (includeRecords) {
      promises.push(
        supabase
          .from("health_records")
          .select("id, title, category, record_date, provider_name, file_type")
          .eq("user_id", userId)
          .order("record_date", { ascending: false })
          .limit(10)
      );
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }

    const [profileRes, healthRes, recordsRes] = await Promise.all(promises);

    // Filter health data based on specific scopes
    let filteredHealth = healthRes.data;
    if (filteredHealth && !shareAll) {
      const filtered: Record<string, any> = {};
      if (scopes.health_summary) {
        filtered.blood_group = filteredHealth.blood_group;
        filtered.height = filteredHealth.height;
        filtered.chronic_diseases = filteredHealth.chronic_diseases;
        filtered.previous_diseases = filteredHealth.previous_diseases;
      }
      if (scopes.allergies) {
        filtered.health_allergies = filteredHealth.health_allergies;
      }
      if (scopes.medications) {
        filtered.current_medications = filteredHealth.current_medications;
      }
      if (includeEmergency) {
        filtered.emergency_contact_name = filteredHealth.emergency_contact_name;
        filtered.emergency_contact_phone = filteredHealth.emergency_contact_phone;
      }
      filteredHealth = filtered;
    }

    return new Response(
      JSON.stringify({
        expires_at: tokenData.expires_at,
        shared_scopes: scopes,
        profile: profileRes.data,
        healthData: filteredHealth,
        records: recordsRes.data || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" } }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "internal", message: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
