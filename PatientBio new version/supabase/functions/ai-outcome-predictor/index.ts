import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
];

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

    const { cohortSummary, selectedVariables, whatIfScenario } = await req.json();
    if (!cohortSummary) {
      return new Response(JSON.stringify({ error: "Missing cohort summary" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const scenarioClause = whatIfScenario
      ? `\n\nAdditionally, apply this "what-if" scenario filter and compare outcomes:\nScenario: ${whatIfScenario}`
      : "";

    const prompt = `You are a clinical outcome prediction analyst. Given cohort data and selected predictor variables, generate predicted outcome distributions with risk stratification.

Cohort Summary:
${cohortSummary}

Selected Predictor Variables: ${selectedVariables?.join(", ") || "age, disease category, medications"}
${scenarioClause}

Provide your response in this exact JSON format (no markdown, pure JSON):
{
  "predictions": [
    {
      "id": "P1",
      "outcomeLabel": "Cardiovascular Event (5-year)",
      "overallRisk": 0.28,
      "subgroups": [
        {
          "name": "Diabetic, Age 60+",
          "risk": 0.72,
          "sampleSize": 45,
          "confidenceInterval": [0.62, 0.82]
        },
        {
          "name": "Non-Diabetic, Age 40-60",
          "risk": 0.15,
          "sampleSize": 80,
          "confidenceInterval": [0.09, 0.21]
        }
      ],
      "keyDrivers": ["HbA1c > 7.0", "Age > 60", "Hypertension history"],
      "interpretation": "Clinical interpretation of this prediction"
    }
  ],
  "riskCurve": [
    { "year": 1, "cumulativeRisk": 0.05, "lower": 0.02, "upper": 0.08 },
    { "year": 2, "cumulativeRisk": 0.10, "lower": 0.06, "upper": 0.14 },
    { "year": 3, "cumulativeRisk": 0.16, "lower": 0.11, "upper": 0.21 },
    { "year": 4, "cumulativeRisk": 0.22, "lower": 0.16, "upper": 0.28 },
    { "year": 5, "cumulativeRisk": 0.28, "lower": 0.21, "upper": 0.35 }
  ],
  "forestPlot": [
    { "variable": "Age > 60", "oddsRatio": 2.4, "lower": 1.8, "upper": 3.2, "pValue": 0.001 },
    { "variable": "Diabetes", "oddsRatio": 1.9, "lower": 1.4, "upper": 2.6, "pValue": 0.003 },
    { "variable": "Hypertension", "oddsRatio": 1.6, "lower": 1.2, "upper": 2.1, "pValue": 0.01 }
  ],
  "whatIfComparison": ${whatIfScenario ? `{
    "scenarioLabel": "Description of the what-if scenario applied",
    "baselineRisk": 0.28,
    "scenarioRisk": 0.18,
    "riskReduction": 0.10,
    "interpretation": "How the scenario changes the outcome"
  }` : "null"},
  "modelConfidence": "medium",
  "limitations": ["List key limitations of this predictive model"],
  "clinicalNote": "Important clinical context for interpreting these predictions"
}

Generate 2-3 outcome predictions based on the data. Use realistic clinical values. All risk values should be 0-1 probabilities.`;

    let parsed = null;
    let lastError = "";

    for (const model of MODELS) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
            }),
          }
        );

        if (!geminiRes.ok) {
          lastError = await geminiRes.text();
          console.error(`Model ${model} failed:`, lastError);
          continue;
        }

        const geminiData = await geminiRes.json();
        let rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        rawText = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        parsed = JSON.parse(rawText);
        break;
      } catch (e) {
        lastError = e.message;
        console.error(`Model ${model} error:`, e);
        continue;
      }
    }

    if (!parsed) {
      return new Response(JSON.stringify({ error: "AI generation failed after all model attempts" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
