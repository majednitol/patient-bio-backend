import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const { shareIds, sections } = await req.json();

    // Use service role to fetch aggregated data across shares
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch shares
    let sharesQuery = adminClient
      .from("patient_researcher_shares")
      .select("*")
      .eq("researcher_id", userId);

    if (shareIds?.length) {
      sharesQuery = sharesQuery.in("id", shareIds);
    }

    const { data: shares, error: sharesError } = await sharesQuery.order("shared_at", { ascending: false });
    if (sharesError) throw sharesError;

    if (!shares || shares.length === 0) {
      return new Response(JSON.stringify({ error: "No shares found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch patient profiles for non-anonymized shares
    const nonAnonPatientIds = shares.filter((s: any) => !s.is_anonymized).map((s: any) => s.patient_id);
    let demographics: any[] = [];
    if (nonAnonPatientIds.length > 0) {
      const { data: profiles } = await adminClient
        .from("user_profiles")
        .select("user_id, date_of_birth, gender")
        .in("user_id", nonAnonPatientIds);
      demographics = profiles || [];
    }

    // Fetch blockchain verification for provenance
    let provenanceHashes: any[] = [];
    if (sections?.includes("provenance")) {
      const patientIds = shares.map((s: any) => s.patient_id);
      const { data: txns } = await adminClient
        .from("blockchain_transactions")
        .select("data_hash, transaction_type, created_at, target_resource_type")
        .in("actor_id", patientIds)
        .order("created_at", { ascending: false })
        .limit(20);
      provenanceHashes = txns || [];
    }

    // Build structured data for AI
    const diseaseCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = { pending: 0, viewed: 0, completed: 0 };
    let anonymizedCount = 0;

    for (const share of shares) {
      const cat = (share as any).disease_category || "General";
      diseaseCounts[cat] = (diseaseCounts[cat] || 0) + 1;
      statusCounts[(share as any).status] = (statusCounts[(share as any).status] || 0) + 1;
      if ((share as any).is_anonymized) anonymizedCount++;
    }

    // Age distribution
    const ageGroups: Record<string, number> = {};
    const genderCounts: Record<string, number> = {};
    for (const profile of demographics) {
      if (profile.date_of_birth) {
        const age = Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        const bracket = age < 18 ? "0-17" : age < 30 ? "18-29" : age < 45 ? "30-44" : age < 60 ? "45-59" : "60+";
        ageGroups[bracket] = (ageGroups[bracket] || 0) + 1;
      }
      if (profile.gender) {
        genderCounts[profile.gender] = (genderCounts[profile.gender] || 0) + 1;
      }
    }

    const cohortSummary = {
      totalShares: shares.length,
      uniquePatients: new Set(shares.map((s: any) => s.patient_id)).size,
      anonymizedCount,
      identifiedCount: shares.length - anonymizedCount,
      diseaseCounts,
      statusCounts,
      ageGroups,
      genderCounts,
      dateRange: {
        earliest: shares[shares.length - 1]?.shared_at,
        latest: shares[0]?.shared_at,
      },
    };

    // Call Gemini for AI insights
    let aiInsights = "";
    if (sections?.includes("ai_insights")) {
      const prompt = `You are a clinical research analyst. Analyze this research cohort data and provide 3-5 key statistical observations and recommendations. Be concise and professional.

Cohort Summary:
- Total data shares: ${cohortSummary.totalShares}
- Unique patients: ${cohortSummary.uniquePatients}
- Anonymized: ${cohortSummary.anonymizedCount}, Identified: ${cohortSummary.identifiedCount}
- Disease categories: ${JSON.stringify(cohortSummary.diseaseCounts)}
- Status breakdown: ${JSON.stringify(cohortSummary.statusCounts)}
- Age distribution: ${JSON.stringify(cohortSummary.ageGroups)}
- Gender distribution: ${JSON.stringify(cohortSummary.genderCounts)}
- Data collection period: ${cohortSummary.dateRange.earliest} to ${cohortSummary.dateRange.latest}

Provide your analysis in markdown format with headers for each observation.`;

      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 1500, temperature: 0.3 },
            }),
          }
        );
        const geminiData = await geminiRes.json();
        aiInsights = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "AI analysis unavailable.";
      } catch (e) {
        console.error("Gemini error:", e);
        aiInsights = "AI analysis could not be generated at this time.";
      }
    }

    return new Response(
      JSON.stringify({
        cohortSummary,
        demographics: { ageGroups, genderCounts },
        provenanceHashes: provenanceHashes.map((h: any) => ({
          hash: h.data_hash?.substring(0, 16) + "...",
          type: h.transaction_type,
          date: h.created_at,
        })),
        aiInsights,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
