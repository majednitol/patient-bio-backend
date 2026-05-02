import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SummarizeRequest {
  documentUrl: string;
  documentTitle: string;
  documentType: string;
  additionalContext?: string;
}

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
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${model}):`, errorText);
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
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SummarizeRequest = await req.json();
    const { documentUrl, documentTitle, documentType, additionalContext } = body;

    if (!documentTitle) {
      return new Response(JSON.stringify({ error: "Document title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Summarizing document: ${documentTitle} for user: ${user.id}`);

    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a medical document summarization assistant. Your task is to analyze medical documents and provide clear, patient-friendly summaries.

When summarizing, focus on:
1. **Key Findings**: Main diagnoses, conditions, or test results
2. **Medications**: Any prescribed medications with dosages
3. **Recommendations**: Follow-up actions, lifestyle changes, or treatments
4. **Important Dates**: Any scheduled appointments or when to take action
5. **Warnings**: Any important warnings or things to watch for

Keep the summary:
- Clear and easy to understand (avoid complex medical jargon where possible)
- Concise but comprehensive (aim for 150-300 words)
- Organized with clear sections
- Actionable - highlight what the patient should do next

Always remind patients to consult their healthcare provider for medical advice.`;

    const userPrompt = `Please summarize this medical document:

**Document Title**: ${documentTitle}
**Document Type**: ${documentType || "General Medical Document"}
${additionalContext ? `**Additional Context**: ${additionalContext}` : ""}

Based on the document title and type, provide a helpful summary that would assist a patient in understanding this document. If you cannot determine specific details from the title alone, provide a general explanation of what this type of document typically contains and what the patient should look for.`;

    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // Try multiple models — each has separate quota pools
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"];
    let summary: string | null = null;

    for (const model of models) {
      console.log(`Trying model: ${model}...`);
      summary = await callGeminiAPI(combinedPrompt, geminiApiKey, model);
      if (summary) break;
      console.log(`${model} failed, trying next...`);
    }

    if (!summary) {
      return new Response(JSON.stringify({ error: "AI quota exhausted across all models. Please try again in a minute." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Summary generated successfully for: ${documentTitle}`);

    return new Response(
      JSON.stringify({
        summary,
        documentTitle,
        documentType,
        generatedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Summarize document error:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
