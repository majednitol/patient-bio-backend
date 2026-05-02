import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MetricData {
  metric_type: string;
  value: number;
  unit: string;
  measured_at: string;
}

const CLINICAL_THRESHOLDS: Record<string, { high?: number; low?: number; label: string }> = {
  blood_pressure_systolic: { high: 140, label: "Hypertensive Range" },
  blood_pressure_diastolic: { high: 90, label: "Hypertensive Range" },
  heart_rate: { high: 100, low: 50, label: "Abnormal Heart Rate" },
  blood_sugar: { high: 200, low: 54, label: "Dangerous Glucose Level" },
  oxygen_saturation: { low: 92, label: "Hypoxemia" },
  temperature: { high: 38.3, label: "Fever" },
  weight: { high: 150, label: "Elevated Weight" },
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

    const { patient_id } = await req.json();
    const targetUserId = patient_id || user.id;

    // Fetch 90 days of metrics
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: metrics, error: metricsError } = await supabaseClient
      .from("health_metrics")
      .select("metric_type, value, unit, measured_at")
      .eq("user_id", targetUserId)
      .gte("measured_at", ninetyDaysAgo.toISOString())
      .order("measured_at", { ascending: true });

    if (metricsError) throw metricsError;
    if (!metrics || metrics.length < 5) {
      return new Response(
        JSON.stringify({ success: true, predictions: [], message: "Insufficient data for predictions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by type
    const byType: Record<string, MetricData[]> = {};
    for (const m of metrics) {
      if (!byType[m.metric_type]) byType[m.metric_type] = [];
      byType[m.metric_type].push(m);
    }

    // Build summary for AI
    const summaryLines: string[] = [];
    for (const [type, data] of Object.entries(byType)) {
      const values = data.map(d => Number(d.value));
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const latest = values[values.length - 1];
      const oldest = values[0];
      const trend = values.length >= 3
        ? ((latest - oldest) / Math.max(oldest, 1) * 100).toFixed(1)
        : "N/A";
      const threshold = CLINICAL_THRESHOLDS[type];

      summaryLines.push(
        `${type}: ${data.length} readings over ${Math.round((Date.now() - new Date(data[0].measured_at).getTime()) / 86400000)} days. ` +
        `Latest=${latest} ${data[0].unit}, Avg=${avg.toFixed(1)}, Trend=${trend}%. ` +
        (threshold ? `Clinical threshold: ${threshold.high ? `high≥${threshold.high}` : ""}${threshold.low ? ` low≤${threshold.low}` : ""} (${threshold.label})` : "No clinical threshold defined.")
      );
    }

    const prompt = `You are a predictive health analytics engine. Analyze these patient metrics and predict if any are trending toward clinical thresholds within the next 2-4 weeks.

Patient Metrics (last 90 days):
${summaryLines.join("\n")}

Return ONLY a JSON array. Each item must match:
{
  "metric_type": string,
  "prediction": string (1-2 sentences, what will happen if trend continues),
  "timeframe": string (e.g. "~2 weeks", "~3 weeks"),
  "confidence": "low" | "medium" | "high",
  "severity": "info" | "warning" | "critical",
  "recommendation": string (1 sentence actionable advice)
}

Rules:
- Only include predictions where there's a clear trending pattern toward a threshold
- If no concerning trends exist, return an empty array []
- Be specific about numbers and timeframes
- Do not diagnose; focus on metric trajectories`;

    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let aiResponse: Response | null = null;
    let lastError = "";

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
      lastError = await response.text();
      console.error(`Model ${model} failed [${response.status}]: ${lastError}`);
      continue;
    }

    if (!aiResponse && lastError) {
      throw new Error(`All Gemini models failed. Last error: ${lastError}`);
    }

    let predictions: any[] = [];

    if (aiResponse) {
      const aiData = await aiResponse.json();
      const content = aiData.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") || "[]";

      try {
        const parsed = JSON.parse(content);
        predictions = Array.isArray(parsed) ? parsed : [];
      } catch {
        console.error("Failed to parse predictions, using empty array");
        predictions = [];
      }
    }

    // Store predictions as health_insights with type "prediction"
    if (predictions.length > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const insightsToInsert = predictions.map((p: any) => ({
        user_id: targetUserId,
        insight_type: "prediction",
        title: `Predicted: ${CLINICAL_THRESHOLDS[p.metric_type]?.label || p.metric_type.replace(/_/g, " ")} risk`,
        content: `${p.prediction} Recommendation: ${p.recommendation}`,
        severity: p.severity || "warning",
        metric_types: [p.metric_type],
        data_summary: { timeframe: p.timeframe, confidence: p.confidence },
        is_read: false,
        expires_at: expiresAt.toISOString(),
      }));

      await supabaseClient.from("health_insights").insert(insightsToInsert);
    }

    return new Response(
      JSON.stringify({ success: true, predictions_count: predictions.length, predictions }),
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
