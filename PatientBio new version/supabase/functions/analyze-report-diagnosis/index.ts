import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth with user's token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { report_id } = await req.json();
    if (!report_id) {
      return new Response(JSON.stringify({ error: "report_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for data fetching
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch report and verify ownership
    const { data: report, error: reportError } = await adminClient
      .from("pathologist_reports")
      .select("id, pathologist_id, patient_id, hospital_lab_order_id, report_name, report_type, disease_category, findings, abnormal_flags, has_abnormal_values")
      .eq("id", report_id)
      .eq("pathologist_id", userId)
      .maybeSingle();

    if (reportError || !report) {
      return new Response(JSON.stringify({ error: "Report not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch patient profile
    const { data: patient } = await adminClient
      .from("user_profiles")
      .select("date_of_birth, gender, display_name")
      .eq("id", report.patient_id)
      .maybeSingle();

    // Fetch hospital lab order context if linked
    let labOrderContext: { clinical_notes: string | null; tests: unknown[] } | null = null;
    if (report.hospital_lab_order_id) {
      const { data: labOrder } = await adminClient
        .from("hospital_lab_orders")
        .select("clinical_notes, tests")
        .eq("id", report.hospital_lab_order_id)
        .maybeSingle();
      if (labOrder) {
        labOrderContext = labOrder;
      }
    }

    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt
    const patientAge = patient?.date_of_birth ? calculateAge(patient.date_of_birth) : null;
    const abnormalFlags = Array.isArray(report.abnormal_flags) ? report.abnormal_flags : [];

    const prompt = `Lab report diagnosis suggestions (AI decision support only, not clinical judgment).

Patient: Age ${patientAge ?? "?"}, Gender ${patient?.gender || "?"}
Report: ${report.report_name}${report.report_type ? `, Type: ${report.report_type}` : ""}${report.disease_category ? `, Category: ${report.disease_category.replace(/_/g, " ")}` : ""}${report.findings ? `\nFindings: ${report.findings}` : ""}
${abnormalFlags.length > 0 ? `Abnormal: ${abnormalFlags.map((f: any) => `${f.name||"?"}=${f.value||"?"} ${f.unit||""} (ref:${f.reference_range||"?"}, ${f.severity||"?"})`).join("; ")}` : ""}
${labOrderContext?.clinical_notes ? `Clinical notes: ${labOrderContext.clinical_notes}` : ""}${labOrderContext && Array.isArray(labOrderContext.tests) ? ` Tests: ${labOrderContext.tests.map((t: any) => t.name||"?").join(",")}` : ""}

JSON: {"suggestions":[{"diagnosis":"string","confidence":"high"|"medium"|"low","reasoning":"2-3 sentences","recommended_followup_tests":["string"],"clinical_notes":"string"}],"disclaimer":"AI suggestions only."} 1-3 diagnoses ranked by likelihood.`;
    let result = await callGeminiAPI(prompt, geminiApiKey, "gemini-2.5-flash");
    if (!result) {
      console.log("Falling back to gemini-2.0-flash...");
      result = await callGeminiAPI(prompt, geminiApiKey, "gemini-2.0-flash");
    }

    if (!result) {
      return new Response(JSON.stringify({ error: "Failed to generate analysis" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
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
    console.error("Analyze report diagnosis error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
