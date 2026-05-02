import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnomalyResult {
  anomalies: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    description: string;
    accessor_name: string;
    timestamp: string;
  }>;
  total_checked: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabaseAuth.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = { id: claimsData.claims.sub };

    // Use service role to read access logs for this patient
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get access logs from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: logs, error: logsError } = await supabase
      .from("access_logs")
      .select("accessor_name, accessor_type, accessed_at, ip_address, city, country")
      .eq("user_id", user.id)
      .gte("accessed_at", sevenDaysAgo.toISOString())
      .order("accessed_at", { ascending: false });

    if (logsError) throw logsError;

    const anomalies: AnomalyResult["anomalies"] = [];

    if (!logs?.length) {
      return new Response(JSON.stringify({ anomalies: [], total_checked: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detection 1: Unusual hours (10 PM - 6 AM)
    const oddHourAccesses = logs.filter((log) => {
      const hour = new Date(log.accessed_at).getHours();
      return hour >= 22 || hour < 6;
    });

    oddHourAccesses.forEach((log) => {
      anomalies.push({
        type: "unusual_hour",
        severity: "medium",
        description: `Access at unusual hour (${new Date(log.accessed_at).toLocaleTimeString()})`,
        accessor_name: log.accessor_name || "Unknown",
        timestamp: log.accessed_at,
      });
    });

    // Detection 2: High frequency access (>10 accesses from same accessor in 1 hour)
    const accessorGroups = new Map<string, string[]>();
    logs.forEach((log) => {
      const key = log.accessor_name || "unknown";
      const times = accessorGroups.get(key) || [];
      times.push(log.accessed_at);
      accessorGroups.set(key, times);
    });

    accessorGroups.forEach((times, accessor) => {
      // Check for bursts within any 1-hour window
      const sorted = times.map((t) => new Date(t).getTime()).sort();
      for (let i = 0; i < sorted.length; i++) {
        const windowEnd = sorted[i] + 3600000; // 1 hour
        const count = sorted.filter((t) => t >= sorted[i] && t <= windowEnd).length;
        if (count > 10) {
          anomalies.push({
            type: "high_frequency",
            severity: "high",
            description: `${count} accesses within 1 hour by ${accessor}`,
            accessor_name: accessor,
            timestamp: new Date(sorted[i]).toISOString(),
          });
          break; // One alert per accessor
        }
      }
    });

    // Detection 3: Access from unusual locations (multiple countries)
    const countries = new Set(logs.map((l) => l.country).filter(Boolean));
    if (countries.size > 2) {
      anomalies.push({
        type: "multi_location",
        severity: "medium",
        description: `Records accessed from ${countries.size} different countries: ${Array.from(countries).join(", ")}`,
        accessor_name: "Multiple",
        timestamp: new Date().toISOString(),
      });
    }

    // Deduplicate by type + accessor
    const seen = new Set<string>();
    const unique = anomalies.filter((a) => {
      const key = `${a.type}:${a.accessor_name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return new Response(JSON.stringify({
      anomalies: unique,
      total_checked: logs.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("Access anomaly detection error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
