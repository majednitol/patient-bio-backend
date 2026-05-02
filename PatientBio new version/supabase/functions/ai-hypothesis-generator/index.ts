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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { poolStats, mode } = await req.json();
    if (!poolStats) {
      return new Response(JSON.stringify({ error: "Missing poolStats" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let prompt: string;

    if (mode === "risk_stratification") {
      prompt = `You are an epidemiological risk analyst. Given the following anonymized global health pool data, categorize the population into risk tiers and provide actionable insights.

Pool Statistics:
- Total contributors: ${poolStats.totalContributors}
- Disease distribution: ${JSON.stringify(poolStats.diseaseDistribution)}
- Age distribution: ${JSON.stringify(poolStats.ageDistribution)}
- Gender distribution: ${JSON.stringify(poolStats.genderDistribution)}
- Jurisdictions: ${JSON.stringify(poolStats.jurisdictions)}

Provide your analysis in this exact JSON format (no markdown, pure JSON):
{
  "tiers": [
    {
      "name": "Critical Risk",
      "color": "red",
      "percentage": 15,
      "count": 45,
      "criteria": "Multiple comorbidities (2+ disease categories), age 60+",
      "topConditions": ["Diabetes + Heart Disease", "Cancer + Diabetes"],
      "recommendation": "Prioritize for longitudinal monitoring studies"
    },
    {
      "name": "Elevated Risk",
      "color": "amber",
      "percentage": 30,
      "count": 90,
      "criteria": "Single chronic condition with risk factors",
      "topConditions": ["Diabetes alone, age 45-60"],
      "recommendation": "Ideal cohort for preventive intervention trials"
    },
    {
      "name": "Moderate Risk",
      "color": "blue",
      "percentage": 35,
      "count": 105,
      "criteria": "Single condition, younger demographics",
      "topConditions": ["COVID-19 recovery, General checkup"],
      "recommendation": "Good control group candidates"
    },
    {
      "name": "Low Risk",
      "color": "green",
      "percentage": 20,
      "count": 60,
      "criteria": "No chronic conditions, healthy age range",
      "topConditions": ["General wellness"],
      "recommendation": "Baseline comparison cohort"
    }
  ],
  "keyInsight": "One sentence summary of the most important finding",
  "studyOpportunity": "One sentence describing the best study opportunity based on this stratification"
}

Base all percentages and counts on the actual data provided. Be specific and data-driven.`;
    } else {
      prompt = `You are a clinical research hypothesis generator. Given the following anonymized global health pool data, generate testable research hypotheses with statistical backing.

Pool Statistics:
- Total contributors: ${poolStats.totalContributors}
- Disease distribution: ${JSON.stringify(poolStats.diseaseDistribution)}
- Age distribution: ${JSON.stringify(poolStats.ageDistribution)}
- Gender distribution: ${JSON.stringify(poolStats.genderDistribution)}
- Jurisdictions: ${JSON.stringify(poolStats.jurisdictions)}

Generate exactly 4 hypotheses. Provide your response in this exact JSON format (no markdown, pure JSON):
{
  "hypotheses": [
    {
      "id": "H1",
      "title": "Short descriptive title",
      "hypothesis": "Formal hypothesis statement (H₀ and H₁)",
      "rationale": "Why this hypothesis is worth testing based on the data patterns",
      "suggestedDesign": "RCT | Case-Control | Cohort | Cross-Sectional",
      "estimatedEffectSize": "small | medium | large",
      "confidence": "high | medium | low",
      "relevantSubgroups": ["age group", "disease category"],
      "potentialImpact": "One sentence on clinical/public health impact"
    }
  ],
  "dataQualityNote": "Brief assessment of whether the pool data is sufficient to test these hypotheses"
}

Base hypotheses on actual patterns visible in the data. Be specific about disease categories and demographics present.`;
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const geminiData = await geminiRes.json();
    let rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Strip markdown code fences if present
    rawText = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse AI response:", rawText);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
