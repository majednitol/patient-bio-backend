import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MetricSummary {
  values: number[];
  unit: string;
  latest: number;
}

interface RequestBody {
  metrics_summary: Record<string, MetricSummary>;
  user_id: string;
}

type GeneratedInsight = {
  insight_type: "trend" | "recommendation" | "alert";
  title: string;
  content: string;
  severity: "info" | "positive" | "warning" | "critical";
  metric_types: string[];
};

const generateFallbackInsights = (
  metrics_summary: Record<string, MetricSummary>
): GeneratedInsight[] => {
  const entries = Object.entries(metrics_summary).filter(([, d]) => d?.values?.length);

  if (entries.length === 0) {
    return [
      {
        insight_type: "recommendation",
        title: "Add more health data",
        content: "Record a few days of metrics to unlock trend-based insights.",
        severity: "info",
        metric_types: [],
      },
    ];
  }

  const stats = entries.map(([type, d]) => {
    const values = d.values.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    const avg = values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
    const latest = Number.isFinite(d.latest) ? Number(d.latest) : values[values.length - 1];
    const rel = avg !== 0 ? (latest - avg) / avg : 0;
    return { type, avg, latest, rel, unit: d.unit, samples: values.length };
  });

  // Pick the metric with the largest relative change vs average
  const mostChanged = stats.reduce((best, cur) => (Math.abs(cur.rel) > Math.abs(best.rel) ? cur : best), stats[0]);

  const trendInsight: GeneratedInsight = {
    insight_type: "trend",
    title: "Recent trend highlight",
    content: `Your ${mostChanged.type.replace(/_/g, " ")} is ${Math.abs(mostChanged.rel) < 0.05 ? "stable" : mostChanged.rel > 0 ? "higher" : "lower"} than your recent average. If this feels unusual for you, consider checking again at a consistent time.`,
    severity: Math.abs(mostChanged.rel) < 0.05 ? "positive" : "info",
    metric_types: [mostChanged.type],
  };

  const topTypes = stats
    .sort((a, b) => b.samples - a.samples)
    .slice(0, 2)
    .map((s) => s.type);

  const recInsight: GeneratedInsight = {
    insight_type: "recommendation",
    title: "Improve consistency",
    content: "Try recording at the same time each day for clearer trends. This isn't medical advice—if you feel unwell or readings worry you, contact a clinician.",
    severity: "info",
    metric_types: topTypes,
  };

  return [trendInsight, recInsight];
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

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { metrics_summary, user_id }: RequestBody = await req.json();

    if (user.id !== user_id) {
      throw new Error("User mismatch");
    }

    // Build analysis prompt
    const metricsText = Object.entries(metrics_summary)
      .map(([type, data]) => {
        const avg = data.values.reduce((a, b) => a + b, 0) / data.values.length;
        const min = Math.min(...data.values);
        const max = Math.max(...data.values);
        return `${type}: Latest=${data.latest}${data.unit}, Avg=${avg.toFixed(1)}, Range=[${min}-${max}], Samples=${data.values.length}`;
      })
      .join("\n");

    const prompt = `2 health insights from 30-day metrics. Metrics:\n${metricsText}\n\nJSON array: [{"insight_type":"trend"|"recommendation"|"alert","title":"<=50chars","content":"<=220chars,2 sentences","severity":"info"|"positive"|"warning"|"critical","metric_types":["string"]}] No line breaks in strings. Encouraging but honest.`;
    // Call Google Gemini API
    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GOOGLE_GEMINI_API_KEY not configured");
    }

    console.log("Calling Google Gemini API...");

    // Try gemini-2.5-flash first, fallback to gemini-2.0-flash
    const models = ["gemini-2.5-flash-lite", "gemini-2.0-flash"];
    let aiResponse: Response | null = null;
    let lastError = "";

    for (const model of models) {
      console.log(`Trying model: ${model}`);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 512,
              responseMimeType: "application/json",
              responseSchema: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    insight_type: { type: "STRING" },
                    title: { type: "STRING" },
                    content: { type: "STRING" },
                    severity: { type: "STRING" },
                    metric_types: { type: "ARRAY", items: { type: "STRING" } },
                  },
                  required: ["insight_type", "title", "content", "severity", "metric_types"],
                },
              },
            },
          }),
        }
      );

      if (response.ok) {
        aiResponse = response;
        console.log(`Success with model: ${model}`);
        break;
      }

      // Check if it's a rate limit error
      if (response.status === 429) {
        lastError = `Rate limited on ${model}`;
        console.log(lastError);
        continue; // Try next model
      }

      // Other errors - stop trying
      const errorText = await response.text();
      throw new Error(`Gemini API error [${response.status}]: ${errorText}`);
    }

    if (!aiResponse) {
      throw new Error(`All models rate limited. Please wait a minute and try again. ${lastError}`);
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error [${aiResponse.status}]: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log("Gemini response received");
    
    const content = aiData.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") || "";

    // Parse JSON from response (robust): handle code fences, multi-part text, and unescaped newlines in strings
    const stripCodeFences = (input: string) => {
      const m = input.match(/```(?:json)?\s*([\s\S]*?)```/);
      return m ? m[1].trim() : input.trim();
    };

    const extractFirstJsonValue = (input: string) => {
      const s = input;
      const starts = [s.indexOf("["), s.indexOf("{")].filter((i) => i >= 0);
      if (starts.length === 0) return null;
      const start = Math.min(...starts);

      let inString = false;
      let escaped = false;
      const stack: string[] = [];
      let started = false;

      for (let i = start; i < s.length; i++) {
        const ch = s[i];

        if (!started) {
          if (ch === "[" || ch === "{") {
            started = true;
            stack.push(ch);
          }
          continue;
        }

        if (inString) {
          if (escaped) {
            escaped = false;
            continue;
          }
          if (ch === "\\") {
            escaped = true;
            continue;
          }
          if (ch === '"') {
            inString = false;
            continue;
          }
          continue;
        }

        if (ch === '"') {
          inString = true;
          continue;
        }

        if (ch === "[" || ch === "{") {
          stack.push(ch);
          continue;
        }

        if (ch === "]" || ch === "}") {
          stack.pop();
          if (stack.length === 0) {
            return s.slice(start, i + 1);
          }
          continue;
        }
      }

      if (!started) return null;

      // Best-effort: auto-close partial JSON (common when the model stops mid-output)
      let tail = s.slice(start).trimEnd();

      if (inString) {
        tail += '"';
      }

      // Remove a trailing comma if present
      tail = tail.replace(/,(\s*)$/, "$1");

      const closers = stack
        .slice()
        .reverse()
        .map((open) => (open === "[" ? "]" : "}"))
        .join("");

      return tail + closers;
    };

    const escapeControlCharsInStrings = (input: string) => {
      let out = "";
      let inString = false;
      let escaped = false;

      for (let i = 0; i < input.length; i++) {
        const ch = input[i];

        if (inString) {
          if (escaped) {
            escaped = false;
            out += ch;
            continue;
          }

          if (ch === "\\") {
            escaped = true;
            out += ch;
            continue;
          }

          if (ch === '"') {
            inString = false;
            out += ch;
            continue;
          }

          // JSON does not allow raw newlines/tabs inside strings
          if (ch === "\n") {
            out += "\\n";
            continue;
          }
          if (ch === "\r") {
            out += "\\r";
            continue;
          }
          if (ch === "\t") {
            out += "\\t";
            continue;
          }

          out += ch;
          continue;
        }

        if (ch === '"') {
          inString = true;
          out += ch;
          continue;
        }

        out += ch;
      }

      return out;
    };

    let insights: any[] = [];

    try {
      const rawText = stripCodeFences(content);
      const extractedJson = extractFirstJsonValue(rawText);

      if (!extractedJson) {
        throw new Error("No JSON found in model output");
      }

      const sanitized = escapeControlCharsInStrings(extractedJson);
      const parsed = JSON.parse(sanitized);
      const normalized = Array.isArray(parsed)
        ? parsed
        : parsed?.insights && Array.isArray(parsed.insights)
          ? parsed.insights
          : null;

      if (!normalized) {
        throw new Error("Unexpected JSON shape");
      }

      insights = normalized;
      console.log(`Parsed ${insights.length} insights`);
    } catch (parseOrFormatError) {
      console.error(
        "AI insights parsing failed; using fallback insights. Error:",
        parseOrFormatError
      );
      insights = generateFallbackInsights(metrics_summary);
      console.log(`Generated ${insights.length} fallback insights`);
    }

    // Store insights in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const insightsToInsert = insights
      .filter((insight: any) => insight.title)
      .map((insight: any) => ({
        user_id: user.id,
        insight_type: insight.insight_type || "recommendation",
        title: insight.title,
        content: insight.content || insight.title,
        severity: insight.severity || "info",
        metric_types: insight.metric_types || [],
        data_summary: metrics_summary,
        is_read: false,
        expires_at: expiresAt.toISOString(),
      }));

    const { error: insertError } = await supabaseClient
      .from("health_insights")
      .insert(insightsToInsert);

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error(`Failed to store insights: ${insertError.message}`);
    }

    console.log("Insights stored successfully");

    return new Response(
      JSON.stringify({ success: true, insights_count: insights.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating health insights:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
