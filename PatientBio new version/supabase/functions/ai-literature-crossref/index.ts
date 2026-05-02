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

    const { question, cohortSummary, studyNotes } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: "Missing research question" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `You are an advanced medical research literature cross-reference engine. A researcher has provided a research question along with their own cohort data summary and study notes. Your task is to:

1. Identify patterns in the researcher's own data
2. Cross-reference those patterns with known medical research themes, landmark studies, and established clinical findings
3. Generate structured cross-reference cards linking "Your Data Pattern" with "Known Research Context"

Research Question: ${question}

Cohort Data Summary:
${cohortSummary || "No cohort data provided"}

Study Notes:
${studyNotes || "No study notes provided"}

Provide your response in this exact JSON format (no markdown, pure JSON):
{
  "crossReferences": [
    {
      "id": "CR1",
      "dataPattern": "Specific pattern observed in the researcher's cohort data",
      "knownContext": "Related findings from established medical literature (cite study names/years where possible)",
      "confidence": 0.85,
      "relevance": "high",
      "implications": "What this cross-reference means for the researcher's work",
      "suggestedFollowUp": "Recommended next steps based on this finding",
      "relatedThemes": ["theme1", "theme2"]
    }
  ],
  "overallSummary": "A 2-3 sentence synthesis of how the researcher's data connects to the broader medical research landscape",
  "gaps": ["Areas where the researcher's data diverges from or has no match in known literature"],
  "recommendedReadings": [
    {
      "title": "Study or paper title",
      "relevance": "Why this reading is relevant"
    }
  ]
}

Generate 3-6 cross-reference cards based on the data provided. Be specific, evidence-based, and clinically relevant. Confidence scores should reflect how well the data pattern maps to known research (0.0-1.0).`;

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
