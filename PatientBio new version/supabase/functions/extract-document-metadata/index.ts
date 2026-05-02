import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractRequest {
  fileName: string;
  fileType: string;
  imageBase64?: string;
}

interface ExtractedMetadata {
  title: string;
  category: string;
  diseaseCategory: string;
  providerName: string;
  recordDate: string;
  confidence: number;
}

async function callGeminiWithVision(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini vision error (${model}):`, errorText);
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error(`Error calling Gemini vision (${model}):`, error);
    return null;
  }
}

async function callGeminiText(prompt: string, apiKey: string, model: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini text error (${model}):`, errorText);
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error(`Error calling Gemini text (${model}):`, error);
    return null;
  }
}

const EXTRACTION_PROMPT = `You are a medical document metadata extractor. Analyze the provided medical document and extract the following fields. Return ONLY a valid JSON object with no markdown formatting, no code blocks, no extra text.

Required JSON fields:
- "title": A concise, descriptive title for this medical document (e.g., "Complete Blood Count Report", "Chest X-Ray", "Metformin Prescription")
- "category": One of: "prescription", "lab_result", "imaging", "vaccination", "other"
- "diseaseCategory": One of: "general", "cancer", "covid19", "diabetes", "heart_disease", "other"
- "providerName": The hospital, clinic, or doctor name if visible (empty string if not found)
- "recordDate": The date of the record in YYYY-MM-DD format if visible (empty string if not found)
- "confidence": A number 0-100 indicating how confident you are in the extraction

Example output:
{"title":"Complete Blood Count Report","category":"lab_result","diseaseCategory":"general","providerName":"Apollo Hospital","recordDate":"2026-01-15","confidence":85}`;

function parseExtractedJson(text: string): ExtractedMetadata | null {
  try {
    // Strip markdown code blocks if present
    let jsonStr = text.trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Find the JSON object
    const startIdx = jsonStr.indexOf("{");
    if (startIdx === -1) return null;
    
    // Find matching closing brace
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < jsonStr.length; i++) {
      if (jsonStr[i] === "{") depth++;
      if (jsonStr[i] === "}") depth--;
      if (depth === 0) { endIdx = i; break; }
    }
    
    if (endIdx === -1) {
      // Truncated - try to repair by closing open braces
      jsonStr = jsonStr.substring(startIdx);
      // Remove trailing incomplete key-value pairs
      jsonStr = jsonStr.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, "");
      jsonStr = jsonStr.replace(/,\s*$/, "");
      jsonStr += "}".repeat(depth);
    } else {
      jsonStr = jsonStr.substring(startIdx, endIdx + 1);
    }
    
    // Clean control characters and trailing commas
    jsonStr = jsonStr
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, " ");

    const parsed = JSON.parse(jsonStr);
    
    const validCategories = ["prescription", "lab_result", "imaging", "vaccination", "other"];
    const validDiseaseCategories = ["general", "cancer", "covid19", "diabetes", "heart_disease", "other"];
    
    return {
      title: String(parsed.title || "").slice(0, 200),
      category: validCategories.includes(parsed.category) ? parsed.category : "other",
      diseaseCategory: validDiseaseCategories.includes(parsed.diseaseCategory) ? parsed.diseaseCategory : "general",
      providerName: String(parsed.providerName || "").slice(0, 200),
      recordDate: /^\d{4}-\d{2}-\d{2}$/.test(parsed.recordDate) ? parsed.recordDate : "",
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
    };
  } catch (e) {
    console.error("Failed to parse extracted JSON:", e);
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ExtractRequest = await req.json();
    const { fileName, fileType, imageBase64 } = body;

    if (!fileName) {
      return new Response(JSON.stringify({ error: "fileName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Extracting metadata from: ${fileName} (${fileType})`);

    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"];
    let resultText: string | null = null;

    const isImage = fileType?.startsWith("image/") && imageBase64;

    for (const model of models) {
      console.log(`Trying model: ${model}...`);
      if (isImage) {
        const prompt = `${EXTRACTION_PROMPT}\n\nThe file name is: "${fileName}".\nAnalyze the medical document image below and extract the metadata.`;
        resultText = await callGeminiWithVision(prompt, imageBase64, fileType, geminiApiKey, model);
      } else {
        const prompt = `${EXTRACTION_PROMPT}\n\nThe file name is: "${fileName}" and the file type is "${fileType}". Based on the filename and type, extract as much metadata as possible. If you cannot determine a field from the filename alone, make a reasonable guess based on the filename pattern or leave it empty.`;
        resultText = await callGeminiText(prompt, geminiApiKey, model);
      }
      if (resultText) break;
      console.log(`${model} failed, trying next...`);
    }

    if (!resultText) {
      return new Response(JSON.stringify({ error: "AI quota exhausted" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = parseExtractedJson(resultText);
    if (!metadata) {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Extracted metadata for ${fileName}:`, JSON.stringify(metadata));

    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Extract metadata error:", error);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
