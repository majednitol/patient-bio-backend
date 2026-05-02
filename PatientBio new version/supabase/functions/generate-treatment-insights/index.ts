import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { patient_id, appointment_id } = await req.json();
    if (!patient_id) throw new Error("patient_id is required");

    // Gather patient data in parallel
    const [
      { data: healthData },
      { data: vitals },
      { data: prescriptions },
      { data: intake },
    ] = await Promise.all([
      supabaseClient
        .from("user_health_data")
        .select("health_allergies, current_medications, chronic_diseases, blood_group")
        .eq("user_id", patient_id)
        .maybeSingle(),
      supabaseClient
        .from("health_metrics")
        .select("metric_type, value, unit, measured_at")
        .eq("user_id", patient_id)
        .order("measured_at", { ascending: false })
        .limit(30),
      supabaseClient
        .from("prescriptions")
        .select("diagnosis, medications, instructions, created_at, is_active")
        .eq("patient_id", patient_id)
        .order("created_at", { ascending: false })
        .limit(5),
      appointment_id
        ? supabaseClient
            .from("appointment_intake")
            .select("chief_complaint, symptom_severity, symptom_duration, self_medications, additional_notes")
            .eq("appointment_id", appointment_id)
            .maybeSingle()
            .then(r => r)
        : Promise.resolve({ data: null }),
    ]);

    // Build comprehensive prompt
    const sections: string[] = [];

    if (intake?.data) {
      const i = intake.data as any;
      sections.push(`INTAKE FORM:\n- Chief Complaint: ${i.chief_complaint || "N/A"}\n- Severity: ${i.symptom_severity || "N/A"}\n- Duration: ${i.symptom_duration || "N/A"}\n- Self-medications: ${i.self_medications || "None"}\n- Notes: ${i.additional_notes || "None"}`);
    }

    if (healthData) {
      sections.push(`PATIENT PROFILE:\n- Allergies: ${healthData.health_allergies || "None"}\n- Current Medications: ${healthData.current_medications || "None"}\n- Chronic Diseases: ${healthData.chronic_diseases || "None"}\n- Blood Group: ${healthData.blood_group || "Unknown"}`);
    }

    if (vitals && vitals.length > 0) {
      const vitalsSum = vitals.slice(0, 10).map((v: any) => `${v.metric_type}: ${v.value} ${v.unit}`).join(", ");
      sections.push(`RECENT VITALS (latest 10): ${vitalsSum}`);
    }

    if (prescriptions && prescriptions.length > 0) {
      const rxSum = prescriptions.map((rx: any) => {
        const meds = (rx.medications || []).map((m: any) => m.name || m.medication_name).join(", ");
        return `- ${rx.diagnosis || "No diagnosis"} (${rx.is_active ? "Active" : "Completed"}): ${meds}`;
      }).join("\n");
      sections.push(`PRESCRIPTION HISTORY:\n${rxSum}`);
    }

    if (sections.length === 0) {
      return new Response(
        JSON.stringify({ success: true, brief: null, message: "Insufficient patient data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Treatment brief (decision support, clinical judgment prevails). Cross-check allergies & drug interactions.

${sections.join("\n\n")}

JSON: {"suggested_plan":"2-3 sentences","contraindicated_medications":[{"name":"string","reason":"string"}],"recommended_medications":[{"name":"string","dosage":"string","frequency":"string","duration":"string","reason":"string"}],"recommended_lab_tests":["string"],"follow_up_timeline":"string","key_considerations":["2-3 items"]}`;
    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let aiResponse: Response | null = null;

    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1024,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (response.ok) { aiResponse = response; break; }
      if (response.status === 429) continue;
      const errText = await response.text();
      throw new Error(`Gemini error [${response.status}]: ${errText}`);
    }

    if (!aiResponse) throw new Error("All AI models rate limited");

    const aiData = await aiResponse.json();
    const content = aiData.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") || "{}";

    let brief;
    try {
      brief = JSON.parse(content);
    } catch {
      brief = { suggested_plan: "Unable to generate treatment brief. Please use clinical judgment.", contraindicated_medications: [], recommended_medications: [], recommended_lab_tests: [], follow_up_timeline: "As clinically indicated", key_considerations: ["Insufficient data for automated recommendations"] };
    }

    return new Response(
      JSON.stringify({ success: true, brief }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
