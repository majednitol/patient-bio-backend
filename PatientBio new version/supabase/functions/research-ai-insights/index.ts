import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PubMed E-utilities (free, no API key required)
async function searchPubMed(diseaseCategories: string[], maxResults = 8): Promise<Array<{ title: string; authors: string; journal: string; year: string; pmid: string; abstract: string }>> {
  if (diseaseCategories.length === 0) return [];

  const terms = diseaseCategories
    .map(cat => cat.replace(/_/g, " "))
    .join(" OR ");
  const query = encodeURIComponent(`(${terms}) AND (clinical study OR cohort OR epidemiology)`);

  try {
    // Step 1: Search for PMIDs
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=${maxResults}&sort=relevance&retmode=json`
    );
    if (!searchRes.ok) { console.error("PubMed search failed:", searchRes.status); return []; }
    const searchData = await searchRes.json();
    const ids: string[] = searchData?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    // Step 2: Fetch summaries
    const summaryRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`
    );
    if (!summaryRes.ok) { console.error("PubMed summary failed:", summaryRes.status); return []; }
    const summaryData = await summaryRes.json();

    // Step 3: Fetch abstracts
    const abstractRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&rettype=abstract&retmode=text`
    );
    const abstractsText = abstractRes.ok ? await abstractRes.text() : "";
    // Split abstracts by PMID separator pattern
    const abstractBlocks = abstractsText.split(/\n\n(?=\d+\.\s)/).map(b => b.trim()).filter(Boolean);

    const results = ids.map((id, idx) => {
      const doc = summaryData?.result?.[id];
      if (!doc) return null;
      const authorList = (doc.authors || []).slice(0, 3).map((a: any) => a.name).join(", ");
      return {
        title: doc.title || "Untitled",
        authors: authorList + (doc.authors?.length > 3 ? " et al." : ""),
        journal: doc.fulljournalname || doc.source || "",
        year: doc.pubdate?.split(" ")?.[0] || "",
        pmid: id,
        abstract: abstractBlocks[idx]?.slice(0, 500) || "",
      };
    }).filter(Boolean);

    return results as any;
  } catch (err) {
    console.error("PubMed fetch error:", err);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { cohortStats, includeLiterature = false } = await req.json();
    if (!cohortStats) {
      return new Response(JSON.stringify({ error: "Missing cohortStats" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch PubMed literature if requested
    let pubmedPapers: any[] = [];
    let literatureSection = "";
    if (includeLiterature) {
      const diseaseKeys = Object.keys(cohortStats.diseaseDistribution || {}).filter(k => k !== "General");
      pubmedPapers = await searchPubMed(diseaseKeys, 8);
      if (pubmedPapers.length > 0) {
        literatureSection = `\n\nRelevant Published Literature (from PubMed):\n${pubmedPapers.map((p, i) =>
          `${i + 1}. "${p.title}" - ${p.authors} (${p.journal}, ${p.year}) [PMID: ${p.pmid}]\n   Abstract excerpt: ${p.abstract.slice(0, 200)}...`
        ).join("\n")}`;
      }
    }

    const basePrompt = `You are a research data analyst and literature specialist. Analyze the following cohort statistics and provide a comprehensive research insight summary.`;

    const insightPrompt = includeLiterature
      ? `${basePrompt}

Focus on these sections (use these exact headings):
## Key Patterns
Notable demographic or disease distribution patterns in the cohort data.

## Data Quality Observations
Sample size adequacy, anonymization ratio, completeness assessment.

## Literature Cross-Reference
Compare this cohort's demographics and disease distribution with the published papers listed below. Identify:
- Which studies align with the current cohort profile
- What populations or conditions are underrepresented in existing literature
- Key findings from the literature that are relevant to this cohort

## Literature Gaps
Identify specific gaps where this cohort's data could contribute NEW knowledge not covered by existing papers.

## Study Design Recommendations
Based on the cohort profile AND the literature landscape, suggest:
- Optimal study designs (RCT, case-control, cohort, etc.)
- Specific hypotheses worth testing
- Recommended sample size targets based on similar published studies

## Suggested Papers
List the most relevant papers from the literature with brief explanations of why they matter for this research.

Cohort Statistics:
- Total shares: ${cohortStats.totalShares}
- Unique patients: ${cohortStats.uniquePatients}
- Anonymized: ${cohortStats.anonymized}, Identified: ${cohortStats.identified}
- Disease distribution: ${JSON.stringify(cohortStats.diseaseDistribution)}
- Status breakdown: ${JSON.stringify(cohortStats.statusBreakdown)}
- Gender distribution: ${JSON.stringify(cohortStats.genderDistribution || {})}
- Age distribution: ${JSON.stringify(cohortStats.ageDistribution || {})}
${literatureSection}

Provide the summary in markdown format, keeping it under 600 words. Be specific, data-driven, and cite PMIDs when referencing papers.`

      : `${basePrompt} Focus on:
1. **Key Patterns**: Notable demographic or disease distribution patterns
2. **Data Quality Observations**: Sample size adequacy, anonymization ratio, completeness
3. **Suggested Next Steps**: Actionable recommendations for the researcher

Cohort Statistics:
- Total shares: ${cohortStats.totalShares}
- Unique patients: ${cohortStats.uniquePatients}
- Anonymized: ${cohortStats.anonymized}, Identified: ${cohortStats.identified}
- Disease distribution: ${JSON.stringify(cohortStats.diseaseDistribution)}
- Status breakdown: ${JSON.stringify(cohortStats.statusBreakdown)}
- Gender distribution: ${JSON.stringify(cohortStats.genderDistribution || {})}
- Age distribution: ${JSON.stringify(cohortStats.ageDistribution || {})}

Provide the summary in markdown format, keeping it under 300 words. Be specific and data-driven.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: insightPrompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: includeLiterature ? 2048 : 1024 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const geminiData = await geminiRes.json();
    const insight = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "No insights generated.";

    return new Response(JSON.stringify({ insight, papers: includeLiterature ? pubmedPapers : undefined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
