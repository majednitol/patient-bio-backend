import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TriageRequest {
  symptoms: string;
  duration?: string;
  severity?: string;
  affected_areas?: string[];
  response_language?: string;
}

async function callGemini(prompt: string, apiKey: string): Promise<string | null> {
  for (const model of ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"]) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
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

function repairTruncatedJson(raw: string): string {
  let s = raw.trim();
  const quoteCount = (s.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) s += '"';
  s = s.replace(/,\s*$/, '');
  const opens = (s.match(/[\[{]/g) || []).length;
  const closes = (s.match(/[\]}]/g) || []).length;
  for (let i = 0; i < opens - closes; i++) {
    const lastBracket = s.lastIndexOf('[');
    const lastBrace = s.lastIndexOf('{');
    s += lastBracket > lastBrace ? ']' : '}';
  }
  return s;
}

function safeParse(raw: string): Record<string, unknown> | null {
  try { return JSON.parse(raw); } catch {}
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1].trim()); } catch {} }
  try { return JSON.parse(repairTruncatedJson(raw)); } catch {}
  return null;
}

function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  return Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
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

    const body: TriageRequest = await req.json();
    if (!body.symptoms?.trim()) {
      return new Response(JSON.stringify({ error: "Symptoms description is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parallel: fetch patient context + doctor list + availability
    const [profileRes, healthRes, metricsRes, treatmentsRes, doctorsRes, connectionsRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("full_name, date_of_birth, gender, weight")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_health_data")
        .select("health_allergies, chronic_diseases, current_medications, blood_group, height, weight")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("health_metrics")
        .select("metric_type, value, unit, measured_at")
        .eq("user_id", user.id)
        .order("measured_at", { ascending: false })
        .limit(10),
      supabase
        .from("patient_running_treatments")
        .select("medication_name, medication_dose, medication_frequency, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(10),
      supabase
        .from("doctor_profiles")
        .select("user_id, full_name, specialty, qualification, diseases_treated, is_verified, consultation_fee")
        .eq("is_verified", true)
        .limit(50),
      supabase
        .from("doctor_patient_access")
        .select("doctor_id")
        .eq("patient_id", user.id)
        .eq("is_active", true),
    ]);

    // Build patient context for prompt
    const profile = profileRes.data;
    const health = healthRes.data;
    const age = profile?.date_of_birth ? calculateAge(profile.date_of_birth) : null;

    const patientContextParts: string[] = [];
    patientContextParts.push(`Patient: Age ${age ?? "Unknown"}, Gender: ${profile?.gender || "Unknown"}`);
    if (health?.chronic_diseases) patientContextParts.push(`Chronic: ${health.chronic_diseases}`);
    if (health?.health_allergies) patientContextParts.push(`Allergies: ${health.health_allergies}`);
    if (health?.current_medications) patientContextParts.push(`Medications: ${health.current_medications}`);
    if ((treatmentsRes.data || []).length > 0) {
      patientContextParts.push(`Active treatments: ${treatmentsRes.data!.map(t => t.medication_name).join(", ")}`);
    }
    const patientContext = patientContextParts.join("\n");

    // Get all available specialties from doctors
    const allDoctors = doctorsRes.data || [];
    const specialties = [...new Set(allDoctors.map(d => d.specialty).filter(Boolean))];
    const connectedDoctorIds = new Set((connectionsRes.data || []).map(c => c.doctor_id));

    const langInstruction = body.response_language === "bn"
      ? '\n\nIMPORTANT: Write ALL text values in Bengali (Bangla). Keep JSON keys in English.'
      : "";

    const prompt = `Triage + specialist recommendation (NOT a diagnosis, general guidance).

Patient: ${patientContext}
Symptoms: ${body.symptoms}${body.duration ? `, Duration: ${body.duration}` : ""}${body.severity ? `, Severity: ${body.severity}` : ""}${body.affected_areas?.length ? `, Areas: ${body.affected_areas.join(",")}` : ""}
Specialties available: ${JSON.stringify(specialties)}

JSON: {"urgency":"emergency"|"see_doctor_soon"|"schedule_appointment"|"self_care","urgency_label":"string","summary":"1-2 sentences","reasoning":"2-3 sentences","recommendations":["3-5 items"],"home_remedies":["0-3, empty for emergency"],"warning_signs":["2-3 red flags"],"recommended_specialties":[{"specialty":"exact name from list","relevance_score":0-100,"reasoning":"1 sentence"}]} Top 1-3 specialties, descending score, only from list.${langInstruction}`;
    const aiResult = await callGemini(prompt, apiKey);
    
    let triage: Record<string, unknown>;
    if (aiResult) {
      const parsed = safeParse(aiResult);
      triage = parsed || {
        urgency: "see_doctor_soon",
        urgency_label: "See a Doctor Soon",
        summary: "Please consult a doctor for proper evaluation.",
        reasoning: "AI assessment could not be fully completed.",
        recommendations: ["Consult a healthcare provider"],
        home_remedies: [],
        warning_signs: ["Seek emergency care if symptoms worsen"],
        recommended_specialties: [],
      };
    } else {
      triage = {
        urgency: "see_doctor_soon",
        urgency_label: "See a Doctor Soon",
        summary: "Please consult a doctor for proper evaluation.",
        reasoning: "AI service temporarily unavailable.",
        recommendations: ["Consult a healthcare provider"],
        home_remedies: [],
        warning_signs: ["Seek emergency care if symptoms worsen"],
        recommended_specialties: [],
      };
    }

    // Score and rank doctors based on AI specialty recommendations
    const recommendedSpecialties = (triage.recommended_specialties as any[]) || [];
    const specialtyScoreMap = new Map<string, { score: number; reasoning: string }>();
    for (const spec of recommendedSpecialties) {
      if (spec.specialty) {
        specialtyScoreMap.set(spec.specialty.toLowerCase(), {
          score: spec.relevance_score || 50,
          reasoning: spec.reasoning || "",
        });
      }
    }

    // Rank doctors
    const scoredDoctors = allDoctors
      .filter(d => {
        const specKey = (d.specialty || "").toLowerCase();
        return specialtyScoreMap.has(specKey);
      })
      .map(d => {
        const specKey = (d.specialty || "").toLowerCase();
        const specData = specialtyScoreMap.get(specKey)!;
        
        // Multi-factor score
        const specialtyScore = specData.score; // 0-100
        const isConnected = connectedDoctorIds.has(d.user_id);
        const connectionBonus = isConnected ? 10 : 0;
        const verifiedBonus = d.is_verified ? 5 : 0;

        // Check disease match
        const diseasesTreated = (d.diseases_treated || []) as string[];
        const symptomsLower = body.symptoms.toLowerCase();
        const diseaseMatch = diseasesTreated.some(disease => 
          symptomsLower.includes(disease.toLowerCase()) || 
          disease.toLowerCase().split(/\s+/).some(w => w.length > 3 && symptomsLower.includes(w))
        );
        const diseaseBonus = diseaseMatch ? 10 : 0;

        const matchScore = Math.min(100, specialtyScore + connectionBonus + verifiedBonus + diseaseBonus);

        return {
          doctor_id: d.user_id,
          full_name: d.full_name,
          specialty: d.specialty,
          qualification: d.qualification,
          diseases_treated: diseasesTreated.slice(0, 5),
          is_connected: isConnected,
          match_score: matchScore,
          match_reasoning: specData.reasoning,
          consultation_fee: d.consultation_fee,
        };
      })
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 5);

    return new Response(JSON.stringify({
      triage: {
        urgency: triage.urgency,
        urgency_label: triage.urgency_label,
        summary: triage.summary,
        reasoning: triage.reasoning,
        recommendations: triage.recommendations,
        home_remedies: triage.home_remedies,
        warning_signs: triage.warning_signs,
        recommended_specialties: recommendedSpecialties,
      },
      doctors: scoredDoctors,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("Symptom triage recommend error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
