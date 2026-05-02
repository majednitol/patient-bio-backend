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
            maxOutputTokens: 512,
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
      return new Response(JSON.stringify({ forecast: null, message: "Authentication required" }), {
        status: 200,
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
      return new Response(JSON.stringify({ forecast: null, message: "Authentication required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get patient spending history (last 6 months)
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, total_amount, invoice_date, status")
      .eq("patient_id", user.id)
      .not("status", "eq", "cancelled")
      .order("invoice_date", { ascending: false });

    if (!invoices?.length) {
      return new Response(JSON.stringify({
        forecast: null,
        message: "Not enough spending data for forecasting",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoiceIds = invoices.map((i) => i.id);
    const { data: items } = await supabase
      .from("invoice_items")
      .select("invoice_id, category, total_price")
      .in("invoice_id", invoiceIds);

    // Aggregate by month
    const invoiceDateMap = new Map(invoices.map((i) => [i.id, i.invoice_date]));
    const monthMap = new Map<string, Record<string, number>>();

    (items || []).forEach((item) => {
      const dateStr = invoiceDateMap.get(item.invoice_id);
      if (!dateStr) return;
      const month = dateStr.substring(0, 7);
      const entry = monthMap.get(month) || { consultation: 0, medication: 0, lab_test: 0, other: 0, total: 0 };
      const amt = item.total_price || 0;
      const cat = (item.category || "other") as string;
      entry[cat] = (entry[cat] || 0) + amt;
      entry.total += amt;
      monthMap.set(month, entry);
    });

    const sortedMonths = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);

    if (sortedMonths.length < 2) {
      return new Response(JSON.stringify({
        forecast: null,
        message: "Need at least 2 months of data for forecasting",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const spendingSummary = sortedMonths.map(([month, data]) => ({
      month,
      ...data,
    }));

    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!geminiApiKey) {
      // Fallback: simple linear projection
      const totals = sortedMonths.map(([, d]) => d.total);
      const avgMonthly = totals.reduce((s, t) => s + t, 0) / totals.length;
      const trend = totals.length >= 2 ? (totals[totals.length - 1] - totals[0]) / totals.length : 0;

      return new Response(JSON.stringify({
        forecast: {
          projected_months: [1, 2, 3].map((i) => ({
            month_offset: i,
            estimated_total: Math.round(avgMonthly + trend * i),
            breakdown: { consultation: Math.round(avgMonthly * 0.4), medication: Math.round(avgMonthly * 0.35), lab_test: Math.round(avgMonthly * 0.15), other: Math.round(avgMonthly * 0.1) },
          })),
          trend_direction: trend > 50 ? "increasing" : trend < -50 ? "decreasing" : "stable",
          summary: `Based on ${sortedMonths.length} months of data, your average monthly spending is ₹${Math.round(avgMonthly).toLocaleString()}.`,
          savings_tip: "Consider asking your doctor about generic medication alternatives to reduce costs.",
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Forecast next 3 months healthcare spending (INR). History: ${JSON.stringify(spendingSummary)}

JSON: {"projected_months":[{"month_offset":1,"estimated_total":N,"breakdown":{"consultation":N,"medication":N,"lab_test":N,"other":N}},...],"trend_direction":"increasing"|"decreasing"|"stable","summary":"1 sentence","savings_tip":"1 tip"}`;

    let result = await callGeminiAPI(prompt, geminiApiKey, "gemini-2.5-flash-lite");
    if (!result) {
      result = await callGeminiAPI(prompt, geminiApiKey, "gemini-2.0-flash");
    }

    if (!result) {
      return new Response(JSON.stringify({ error: "Failed to generate forecast" }), {
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

    return new Response(JSON.stringify({ forecast: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cost forecast error:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
