import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScoreBreakdown {
  coverage: number;
  inRange: number;
  trend: number;
  consistency: number;
}

interface TipRequest {
  breakdown: ScoreBreakdown;
  trackedTypes: string[];
  untrackedTypes: string[];
  totalScore: number;
}

interface Tip {
  title: string;
  description: string;
  estimatedImpact: number;
  targetCategory: "coverage" | "inRange" | "trend" | "consistency";
}

function generateFallbackTips(req: TipRequest): Tip[] {
  const tips: Tip[] = [];

  if (req.breakdown.coverage < 15 && req.untrackedTypes.length > 0) {
    const types = req.untrackedTypes.slice(0, 2).map(t => t.replace(/_/g, " "));
    tips.push({
      title: "Track more metrics",
      description: `Start logging ${types.join(" and ")} to improve your Coverage score. Each new metric type adds points.`,
      estimatedImpact: Math.min(5, Math.round((25 - req.breakdown.coverage) / req.untrackedTypes.length * 2)),
      targetCategory: "coverage",
    });
  }

  if (req.breakdown.consistency < 10) {
    tips.push({
      title: "Log daily for consistency",
      description: "Try recording at least one health metric every day. Consistent tracking over 2 weeks maximizes your Consistency score.",
      estimatedImpact: Math.min(8, 15 - req.breakdown.consistency),
      targetCategory: "consistency",
    });
  }

  if (req.breakdown.inRange < 25) {
    tips.push({
      title: "Focus on healthy ranges",
      description: "Some of your recent readings are outside normal ranges. Small lifestyle adjustments can bring them back on track.",
      estimatedImpact: Math.min(5, 35 - req.breakdown.inRange),
      targetCategory: "inRange",
    });
  }

  if (req.breakdown.trend < 15) {
    tips.push({
      title: "Work on improving trends",
      description: "Your recent values are trending away from optimal. Consistent effort over the next week can reverse this.",
      estimatedImpact: Math.min(5, 25 - req.breakdown.trend),
      targetCategory: "trend",
    });
  }

  return tips.slice(0, 3);
}

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

    const body: TipRequest = await req.json();
    const { breakdown, trackedTypes, untrackedTypes, totalScore } = body;

    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    if (!geminiApiKey) {
      const tips = generateFallbackTips(body);
      return new Response(JSON.stringify({ tips }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Health coach. Patient score: ${totalScore}/100. Coverage:${breakdown.coverage}/25, InRange:${breakdown.inRange}/35, Trend:${breakdown.trend}/25, Consistency:${breakdown.consistency}/15. Tracked:[${trackedTypes.join(",")}] Untracked:[${untrackedTypes.join(",")}]. Give 3 tips targeting weakest category. JSON array: [{"title":"<40chars","description":"<150chars,2sentences","estimatedImpact":<1-10>,"targetCategory":"coverage"|"inRange"|"trend"|"consistency"}]`;

    const models = ["gemini-2.5-flash-lite", "gemini-2.0-flash"];
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
              temperature: 0.3,
              maxOutputTokens: 256,
              responseMimeType: "application/json",
              responseSchema: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING" },
                    description: { type: "STRING" },
                    estimatedImpact: { type: "NUMBER" },
                    targetCategory: { type: "STRING" },
                  },
                  required: ["title", "description", "estimatedImpact", "targetCategory"],
                },
              },
            },
          }),
        }
      );

      if (response.ok) { aiResponse = response; break; }
      if (response.status === 429) continue;
      break;
    }

    if (!aiResponse || !aiResponse.ok) {
      const tips = generateFallbackTips(body);
      return new Response(JSON.stringify({ tips }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") || "[]";

    let tips: Tip[];
    try {
      const parsed = JSON.parse(content);
      tips = Array.isArray(parsed) ? parsed.slice(0, 3) : generateFallbackTips(body);
    } catch {
      tips = generateFallbackTips(body);
    }

    return new Response(JSON.stringify({ tips }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating score tips:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate tips" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
