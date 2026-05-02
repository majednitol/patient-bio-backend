import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SuggestRequest {
  chief_complaint: string;
  symptom_duration?: string;
  symptom_severity?: string;
  self_medications?: string;
  additional_notes?: string;
  patient_allergies?: string[];
  patient_age?: number;
  patient_gender?: string;
}

async function callGeminiAPI(prompt: string, apiKey: string, model: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      console.error(`Gemini API error (${model}):`, await response.text());
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error(`Error calling Gemini API (${model}):`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SuggestRequest = await req.json();
    if (!body.chief_complaint) {
      return new Response(JSON.stringify({ error: "Chief complaint is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Clinical decision support (SUGGESTIONS only). Complaint: ${body.chief_complaint}${body.symptom_duration ? `, Duration: ${body.symptom_duration}` : ""}${body.symptom_severity ? `, Severity: ${body.symptom_severity}` : ""}${body.self_medications ? `, Self-meds: ${body.self_medications}` : ""}${body.additional_notes ? `, Notes: ${body.additional_notes}` : ""}${body.patient_allergies?.length ? `, Allergies: ${body.patient_allergies.join(",")}` : ""}${body.patient_age ? `, Age: ${body.patient_age}` : ""}${body.patient_gender ? `, Gender: ${body.patient_gender}` : ""}

JSON: {"suggestions":[{"diagnosis":"string","confidence":"high"|"medium"|"low","reasoning":"1-2 sentences","medications":[{"name":"string","dosage":"string","frequency":"string","duration":"string","instructions":"string"}],"general_instructions":"string"}]} 1-3 ranked. Avoid allergic medications.`;
    let result = await callGeminiAPI(prompt, geminiApiKey, "gemini-2.5-flash");
    if (!result) {
      console.log("Falling back to gemini-2.0-flash...");
      result = await callGeminiAPI(prompt, geminiApiKey, "gemini-2.0-flash");
    }

    if (!result) {
      return new Response(JSON.stringify({ error: "Failed to generate suggestions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON from the response
    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        parsed = JSON.parse(result.trim());
      }
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Suggest diagnosis error:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
