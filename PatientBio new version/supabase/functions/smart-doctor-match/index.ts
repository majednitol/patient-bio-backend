import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MatchRequest {
  symptoms: string;
  specialties: string[];
  patientContext?: {
    age?: number | null;
    gender?: string | null;
    chronicDiseases?: string | null;
    allergies?: string | null;
    currentMedications?: string | null;
  };
}

interface AIMatch {
  specialty: string;
  relevance_score: number;
  reasoning: string;
  matched_concepts: string[];
}

interface AIResponse {
  matches: AIMatch[];
  follow_up_questions?: string[];
}

async function callGemini(prompt: string, apiKey: string): Promise<string | null> {
  for (const model of ["gemini-2.5-flash-lite", "gemini-2.0-flash"]) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 768,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!res.ok) { console.error(`Gemini ${model} error:`, await res.text()); continue; }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (e) { console.error(`Gemini ${model} error:`, e); }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: MatchRequest = await req.json();
    if (!body.symptoms?.trim() || !body.specialties?.length) {
      return new Response(JSON.stringify({ error: "Symptoms and specialties are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uniqueSpecialties = [...new Set(body.specialties.map(s => s.trim()).filter(Boolean))];

    // Build patient context section
    let patientContextSection = "";
    if (body.patientContext) {
      const ctx = body.patientContext;
      const parts: string[] = [];
      if (ctx.age) parts.push(`Age: ${ctx.age}`);
      if (ctx.gender) parts.push(`Gender: ${ctx.gender}`);
      if (ctx.chronicDiseases) parts.push(`Chronic conditions: ${ctx.chronicDiseases}`);
      if (ctx.allergies) parts.push(`Allergies: ${ctx.allergies}`);
      if (ctx.currentMedications) parts.push(`Current medications: ${ctx.currentMedications}`);
      if (parts.length > 0) {
        patientContextSection = `\n\nPatient Profile:\n${parts.join("\n")}\n\nUse this patient context to adjust specialty relevance. For example, a diabetic patient with foot numbness should rank Endocrinology higher. A pregnant patient should consider OB-GYN.`;
      }
    }

    const prompt = `Rank medical specialties by relevance to symptoms. Only use specialties from the list. Score 0-100, include >=30, max 5, descending. Add 1-3 matched_concepts per match and 2-3 follow_up_questions.

Symptoms: "${body.symptoms}"${patientContextSection}
Specialties: ${JSON.stringify(uniqueSpecialties)}

JSON: {"matches":[{"specialty":"exact name","relevance_score":85,"reasoning":"1 sentence","matched_concepts":["concept"]}],"follow_up_questions":["Q1?","Q2?"]}`;
    const result = await callGemini(prompt, apiKey);
    if (!result) {
      return new Response(JSON.stringify({ matches: [], follow_up_questions: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: AIResponse;
    try {
      // Try direct parse first
      parsed = JSON.parse(result);
    } catch {
      try {
        // Try extracting from markdown code block
        const m = result.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) {
          parsed = JSON.parse(m[1].trim());
        } else {
          // Try to salvage truncated JSON by fixing common issues
          let cleaned = result.trim();
          // Remove trailing incomplete strings/objects
          const lastValidBracket = cleaned.lastIndexOf('}');
          if (lastValidBracket > 0) {
            cleaned = cleaned.substring(0, lastValidBracket + 1);
            // Ensure the outer object is closed
            const openBraces = (cleaned.match(/{/g) || []).length;
            const closeBraces = (cleaned.match(/}/g) || []).length;
            for (let i = 0; i < openBraces - closeBraces; i++) {
              cleaned += '}';
            }
            const openBrackets = (cleaned.match(/\[/g) || []).length;
            const closeBrackets = (cleaned.match(/\]/g) || []).length;
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              cleaned += ']';
            }
            parsed = JSON.parse(cleaned);
          } else {
            throw new Error("Could not parse AI response");
          }
        }
      } catch (innerErr) {
        console.error("Failed to parse AI response:", result.substring(0, 500));
        parsed = { matches: [], follow_up_questions: [] };
      }
    }

    // Validate and clamp scores
    const validMatches = (parsed.matches || [])
      .filter((m: AIMatch) => uniqueSpecialties.some(s => s.toLowerCase() === m.specialty.toLowerCase()) && m.relevance_score >= 30)
      .map((m: AIMatch) => ({
        ...m,
        relevance_score: Math.min(100, Math.max(0, Math.round(m.relevance_score))),
        matched_concepts: (m.matched_concepts || []).slice(0, 3),
      }))
      .sort((a: AIMatch, b: AIMatch) => b.relevance_score - a.relevance_score)
      .slice(0, 5);

    const followUpQuestions = (parsed.follow_up_questions || [])
      .filter((q: string) => typeof q === "string" && q.trim().length > 0)
      .slice(0, 3);

    return new Response(JSON.stringify({ matches: validMatches, follow_up_questions: followUpQuestions }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("Smart doctor match error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
