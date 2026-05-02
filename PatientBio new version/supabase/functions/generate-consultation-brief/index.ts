import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BriefRequest {
  patient_id: string;
  appointment_id?: string;
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 512,
          },
        }),
      }
    );
    if (!response.ok) {
      console.error(`Gemini error (${model}):`, await response.text());
      return null;
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error(`Gemini call failed (${model}):`, error);
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
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

    const body: BriefRequest = await req.json();
    if (!body.patient_id) {
      return new Response(JSON.stringify({ error: "patient_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather all patient context in parallel
    const [healthRes, rxRes, vitalsRes, intakeRes] = await Promise.all([
      supabase
        .from("health_data")
        .select("blood_group, health_allergies, chronic_diseases, current_medications, height, weight")
        .eq("user_id", body.patient_id)
        .maybeSingle(),
      supabase
        .from("prescriptions")
        .select("diagnosis, medications, instructions, created_at")
        .eq("patient_id", body.patient_id)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("patient_vitals")
        .select("bp_systolic, bp_diastolic, heart_rate, temperature, spo2, weight, recorded_at")
        .eq("patient_id", body.patient_id)
        .order("recorded_at", { ascending: false })
        .limit(5),
      body.appointment_id
        ? supabase
            .from("appointment_intake")
            .select("chief_complaint, symptom_duration, symptom_severity, self_medications, additional_notes")
            .eq("appointment_id", body.appointment_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const health = healthRes.data;
    const prescriptions = rxRes.data || [];
    const vitals = vitalsRes.data || [];
    const intake = intakeRes.data;

    // Build context sections
    const sections: string[] = [];

    if (intake) {
      const parts = [`Chief Complaint: ${intake.chief_complaint || "Not specified"}`];
      if (intake.symptom_duration) parts.push(`Duration: ${intake.symptom_duration}`);
      if (intake.symptom_severity) parts.push(`Severity: ${intake.symptom_severity}`);
      if (intake.self_medications) parts.push(`Self-medications: ${intake.self_medications}`);
      if (intake.additional_notes) parts.push(`Notes: ${intake.additional_notes}`);
      sections.push(`TODAY'S INTAKE:\n${parts.join("\n")}`);
    }

    if (health) {
      const parts: string[] = [];
      if (health.health_allergies) parts.push(`⚠ ALLERGIES: ${health.health_allergies}`);
      if (health.chronic_diseases) parts.push(`Chronic conditions: ${health.chronic_diseases}`);
      if (health.current_medications) parts.push(`Current medications: ${health.current_medications}`);
      if (health.blood_group) parts.push(`Blood group: ${health.blood_group}`);
      if (parts.length) sections.push(`HEALTH PROFILE:\n${parts.join("\n")}`);
    }

    if (vitals.length > 0) {
      const latest = vitals[0];
      const parts: string[] = [];
      if (latest.bp_systolic && latest.bp_diastolic) parts.push(`BP: ${latest.bp_systolic}/${latest.bp_diastolic}`);
      if (latest.heart_rate) parts.push(`HR: ${latest.heart_rate} bpm`);
      if (latest.spo2) parts.push(`SpO2: ${latest.spo2}%`);
      if (latest.temperature) parts.push(`Temp: ${latest.temperature}°C`);
      if (latest.weight) parts.push(`Weight: ${latest.weight} kg`);
      if (parts.length) sections.push(`LATEST VITALS (${latest.recorded_at?.split("T")[0] || "recent"}):\n${parts.join(", ")}`);

      // Check for trends
      if (vitals.length >= 3) {
        const bpReadings = vitals.filter((v: any) => v.bp_systolic).map((v: any) => v.bp_systolic);
        if (bpReadings.length >= 3 && bpReadings[0] > bpReadings[1] && bpReadings[1] > bpReadings[2]) {
          sections.push(`TREND ALERT: Systolic BP rising over last 3 readings: ${bpReadings.slice(0, 3).reverse().join(" → ")}`);
        }
      }
    }

    if (prescriptions.length > 0) {
      const rxSummary = prescriptions.map((rx: any) => {
        const meds = Array.isArray(rx.medications) ? rx.medications.map((m: any) => m.name).join(", ") : "N/A";
        const date = rx.created_at?.split("T")[0] || "unknown";
        return `  - ${rx.diagnosis || "No diagnosis"} (${date}): ${meds}`;
      }).join("\n");
      sections.push(`RECENT PRESCRIPTIONS:\n${rxSummary}`);
    }

    if (sections.length === 0) {
      return new Response(JSON.stringify({
        brief: "No prior patient data available. This appears to be a first visit — proceed with a thorough history intake.",
        data_available: false,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!geminiApiKey) {
      // Return a structured fallback without AI
      const fallbackBrief = sections.join("\n\n");
      return new Response(JSON.stringify({
        brief: fallbackBrief,
        data_available: true,
        ai_generated: false,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Clinical pre-consultation brief. Summarize in 4-6 sentences: why patient is here, critical alerts (allergies, abnormal vitals), medical history, last visit context. Be direct, use bullets. No disclaimers.

DATA:
${sections.join("\n\n")}`;

    let brief = await callGemini(prompt, geminiApiKey, "gemini-2.5-flash-lite");
    if (!brief) {
      brief = await callGemini(prompt, geminiApiKey, "gemini-2.0-flash");
    }
    return new Response(JSON.stringify({
      brief: brief || sections.join("\n\n"),
      data_available: true,
      ai_generated: !!brief,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auto-brief error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
