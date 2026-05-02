import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScreenerRequest {
  symptoms: string;
  duration?: string;
  severity?: string;
  response_language?: string;
  affected_areas?: string[];
  follow_up_answers?: Record<string, boolean>;
  previous_result?: {
    urgency: string;
    summary: string;
    reasoning: string;
    follow_up_questions: string[];
  };
}

interface GeminiResult {
  text: string | null;
  finishReason?: string;
}

async function callGemini(prompt: string, apiKey: string): Promise<GeminiResult> {
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
      const finishReason = data.candidates?.[0]?.finishReason;
      if (finishReason === "MAX_TOKENS") {
        console.warn(`Gemini ${model} response truncated (MAX_TOKENS)`);
      }
      if (text) return { text, finishReason };
    } catch (e) { console.error(`Gemini ${model} error:`, e); }
  }
  return { text: null };
}

function repairTruncatedJson(raw: string): string {
  let s = raw.trim();
  const quoteCount = (s.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) s += '"';
  const opens = (s.match(/[\[{]/g) || []).length;
  const closes = (s.match(/[\]}]/g) || []).length;
  s = s.replace(/,\s*$/, '');
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week(s) ago`;
  return `${Math.floor(days / 30)} month(s) ago`;
}

function buildPatientContextPrompt(
  profile: any,
  healthData: any,
  metrics: any[],
  treatments: any[],
  investigations: any[],
  pastScreenings: any[]
): string {
  const sections: string[] = [];

  // Patient Medical Profile
  const age = profile?.date_of_birth ? calculateAge(profile.date_of_birth) : null;
  const gender = profile?.gender || healthData?.gender || "Unknown";
  const bloodGroup = healthData?.blood_group || "Unknown";
  const weight = healthData?.weight || profile?.weight || null;
  const height = healthData?.height || null;

  sections.push(`PATIENT MEDICAL PROFILE:
- Name: ${profile?.full_name || "Patient"}, Age: ${age ?? "Unknown"}, Gender: ${gender}, Blood Group: ${bloodGroup}
- Weight: ${weight || "Unknown"}, Height: ${height || "Unknown"}`);

  // Current Health Status
  const chronicDiseases = healthData?.chronic_diseases || "None";
  const allergies = healthData?.health_allergies || "None";
  const medications = healthData?.current_medications || "None";

  sections.push(`CURRENT HEALTH STATUS:
- Chronic Diseases: ${chronicDiseases}
- Known Allergies: ${allergies}
- Current Medications: ${medications}`);

  // Recent Health Trends
  if (metrics.length > 0) {
    const metricLines = metrics.map(
      (m) => `- ${m.metric_type.replace(/_/g, " ")}: ${m.value} ${m.unit} (${timeAgo(m.measured_at)})`
    );
    sections.push(`RECENT HEALTH TRENDS (last readings):\n${metricLines.join("\n")}`);
  }

  // Active Treatments
  if (treatments.length > 0) {
    const treatmentLines = treatments.map(
      (t) => `- ${t.medication_name || "Treatment"} ${t.medication_dose || ""} ${t.medication_frequency || ""} (${t.is_active ? "ongoing" : "completed"})`
    );
    sections.push(`ACTIVE TREATMENTS:\n${treatmentLines.join("\n")}`);
  }

  // Clinical Investigations
  if (investigations.length > 0) {
    const invLines = investigations.map(
      (inv) => `- ${inv.investigation_type}: ${inv.notes || "No details"} (${timeAgo(inv.investigation_date || inv.created_at)})`
    );
    sections.push(`RECENT LAB RESULTS:\n${invLines.join("\n")}`);
  }

  // Past Screenings
  if (pastScreenings.length > 0) {
    const screenLines = pastScreenings.map(
      (s) => `- "${s.symptoms}" -> ${s.urgency} (${timeAgo(s.created_at)})`
    );
    sections.push(`RECENT SYMPTOM SCREENINGS:\n${screenLines.join("\n")}`);
  }

  sections.push(`Use this full patient context to provide more personalized triage.
Cross-reference allergies and current medications before any suggestions.
Consider chronic conditions when assessing urgency.
Note any patterns from recent screenings.`);

  return sections.join("\n\n");
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

    const body: ScreenerRequest = await req.json();
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

    // Fetch patient's full medical context server-side (parallel)
    const [profileRes, healthRes, metricsRes, treatmentsRes, investigationsRes, screeningsRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("full_name, date_of_birth, gender, weight, address")
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
        .from("patient_clinical_investigations")
        .select("investigation_type, investigation_date, notes, created_at")
        .eq("user_id", user.id)
        .order("investigation_date", { ascending: false })
        .limit(5),
      supabase
        .from("symptom_screenings")
        .select("symptoms, urgency, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    const patientContext = buildPatientContextPrompt(
      profileRes.data,
      healthRes.data,
      metricsRes.data || [],
      treatmentsRes.data || [],
      investigationsRes.data || [],
      screeningsRes.data || []
    );

    const isFollowUp = body.follow_up_answers && body.previous_result;
    const langInstruction = body.response_language === "bn"
      ? '\n\nIMPORTANT: Respond with ALL text field values (summary, reasoning, recommendations, home_remedies, warning_signs, urgency_label, estimated_savings, follow_up_questions) written in Bengali (Bangla) language. Keep JSON keys in English.'
      : "";

    let prompt: string;

    if (isFollowUp) {
      const answersText = Object.entries(body.follow_up_answers!)
        .map(([q, a]) => `- "${q}": ${a ? "Yes" : "No"}`)
        .join("\n");

      prompt = `Health triage refinement. NOT a diagnosis—general guidance only. Emergency symptoms=immediate care.

${patientContext}

Symptoms: ${body.symptoms}${body.duration ? `, Duration: ${body.duration}` : ""}${body.severity ? `, Severity: ${body.severity}` : ""}${body.affected_areas?.length ? `, Areas: ${body.affected_areas.join(", ")}` : ""}

Previous: ${body.previous_result!.urgency} - ${body.previous_result!.summary}

Follow-up: ${answersText}

Refine assessment. JSON: {"urgency":"emergency"|"see_doctor_soon"|"schedule_appointment"|"self_care","urgency_label":"string","summary":"1-2 sentences","reasoning":"2-3 sentences","recommendations":["3-5 items"],"home_remedies":["0-3, empty for emergency"],"warning_signs":["2-3 red flags"],"estimated_savings":"string or empty","otc_suggestions":[{"name":"string","usage":"string","note":"string"}] (only for self_care, else []),"is_refined":true}${langInstruction}`;
    } else {
      prompt = `Health triage. NOT a diagnosis—general guidance only. Chest pain/difficulty breathing/severe bleeding=emergency.

${patientContext}

Symptoms: ${body.symptoms}${body.duration ? `, Duration: ${body.duration}` : ""}${body.severity ? `, Severity: ${body.severity}` : ""}${body.affected_areas?.length ? `, Areas: ${body.affected_areas.join(", ")}` : ""}

JSON: {"urgency":"emergency"|"see_doctor_soon"|"schedule_appointment"|"self_care","urgency_label":"string","summary":"1-2 sentences","reasoning":"2-3 sentences","recommendations":["3-5 items"],"home_remedies":["0-3, empty for emergency"],"warning_signs":["2-3 red flags"],"estimated_savings":"string or empty","otc_suggestions":[{"name":"string","usage":"string","note":"string"}] (only for self_care, else []),"follow_up_questions":["2-3 yes/no Qs for schedule/see_doctor, else []"]}${langInstruction}`;
    }

    const geminiResult = await callGemini(prompt, apiKey);
    if (!geminiResult.text) {
      return new Response(JSON.stringify({ error: "Failed to generate assessment" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed = safeParse(geminiResult.text);

    if (!parsed) {
      console.error("All JSON parsing failed. Raw response:", geminiResult.text.substring(0, 500));
      parsed = {
        urgency: "see_doctor_soon",
        urgency_label: body.response_language === "bn" ? "ডাক্তারের সাথে দেখা করুন" : "See a doctor soon",
        summary: body.response_language === "bn" ? "আপনার উপসর্গের উপর ভিত্তি করে একজন ডাক্তারের সাথে পরামর্শ করুন।" : "Based on your symptoms, please consult a doctor for proper evaluation.",
        reasoning: body.response_language === "bn" ? "AI মূল্যায়ন সম্পূর্ণ করতে পারেনি। নিরাপত্তার জন্য ডাক্তার দেখানো সুপারিশ করা হচ্ছে।" : "The AI assessment could not be fully completed. For safety, we recommend seeing a doctor.",
        recommendations: [body.response_language === "bn" ? "একজন ডাক্তারের সাথে পরামর্শ করুন" : "Consult a healthcare provider"],
        home_remedies: [],
        warning_signs: [body.response_language === "bn" ? "উপসর্গ খারাপ হলে জরুরি সেবায় যান" : "Seek emergency care if symptoms worsen"],
        estimated_savings: "",
        follow_up_questions: [],
      };
    }

    if (!parsed.follow_up_questions) {
      parsed.follow_up_questions = [];
    }

    return new Response(JSON.stringify(parsed), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Symptom prescreener error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
