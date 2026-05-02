import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing x-api-key header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyHash = await hashKey(apiKey);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate API key
    const { data: keyRecord, error: keyError } = await supabase
      .from("researcher_api_keys")
      .select("id, researcher_id, scopes, expires_at, is_active")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .single();

    if (keyError || !keyRecord) {
      return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(keyRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "API key expired" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update last_used_at
    await supabase
      .from("researcher_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id);

    const url = new URL(req.url);
    const resource = url.searchParams.get("resource") || "pool";
    const scopes = keyRecord.scopes as string[];

    // Route based on resource
    if (resource === "pool") {
      if (!scopes.includes("pool:read")) {
        return new Response(JSON.stringify({ error: "Insufficient scope: pool:read required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const diseaseFilter = url.searchParams.get("disease");

      let query = supabase
        .from("anonymous_health_contributions")
        .select("id, contribution_hash, data_categories, disease_categories, age_range, gender, source_jurisdiction, contributed_at")
        .eq("is_active", true)
        .eq("govt_approval_status", "approved")
        .range(offset, offset + limit - 1)
        .order("contributed_at", { ascending: false });

      if (diseaseFilter) {
        query = query.contains("disease_categories", [diseaseFilter]);
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ data, meta: { limit, offset, count: data?.length || 0 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resource === "cohort") {
      if (!scopes.includes("cohort:read")) {
        return new Response(JSON.stringify({ error: "Insufficient scope: cohort:read required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
      const { data, error } = await supabase
        .from("patient_researcher_shares")
        .select("patient_id, disease_category, shared_at, is_anonymized, status")
        .eq("researcher_id", keyRecord.researcher_id)
        .in("status", ["pending", "viewed", "completed"])
        .order("shared_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return new Response(JSON.stringify({ data, meta: { count: data?.length || 0 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resource === "stats") {
      if (!scopes.includes("pool:read")) {
        return new Response(JSON.stringify({ error: "Insufficient scope: pool:read required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("anonymous_health_contributions")
        .select("disease_categories, age_range, gender, source_jurisdiction")
        .eq("is_active", true)
        .limit(500);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        diseaseDistribution: {} as Record<string, number>,
        ageDistribution: {} as Record<string, number>,
        genderDistribution: {} as Record<string, number>,
        jurisdictions: [...new Set((data || []).map(d => d.source_jurisdiction))],
      };

      (data || []).forEach(d => {
        (d.disease_categories as string[]).forEach(dc => {
          stats.diseaseDistribution[dc] = (stats.diseaseDistribution[dc] || 0) + 1;
        });
        const age = d.age_range || "unknown";
        stats.ageDistribution[age] = (stats.ageDistribution[age] || 0) + 1;
        const gender = d.gender || "unknown";
        stats.genderDistribution[gender] = (stats.genderDistribution[gender] || 0) + 1;
      });

      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown resource. Use: pool, cohort, stats" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("API gateway error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
