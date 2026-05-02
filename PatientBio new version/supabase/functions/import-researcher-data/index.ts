import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  importType: "research_studies" | "participant_cohorts" | "study_notes";
  csvContent: string;
  conflictResolution: "merge" | "replace" | "skip";
  options?: {
    sendInvitations?: boolean;
  };
}

interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  warnings: Array<{ row: number; message: string }>;
}

function parseCSV(csvContent: string): { headers: string[]; rows: string[][] } {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV must have at least a header row and one data row");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });

  return { headers, rows };
}

function getValueByHeader(row: string[], headers: string[], headerName: string): string {
  const index = headers.indexOf(headerName.toLowerCase());
  return index >= 0 ? row[index]?.trim() || "" : "";
}

async function importResearchStudies(
  supabase: ReturnType<typeof createClient>,
  researcherId: string,
  headers: string[],
  rows: string[][],
  conflictResolution: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  };

  const requiredHeaders = ["title", "disease_category", "token_budget"];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(", ")}`);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const title = getValueByHeader(row, headers, "title");
      const diseaseCategory = getValueByHeader(row, headers, "disease_category");
      const tokenBudget = parseInt(getValueByHeader(row, headers, "token_budget") || "0", 10);
      const tokensPerPatient = parseInt(getValueByHeader(row, headers, "tokens_per_patient") || "10", 10);
      const description = getValueByHeader(row, headers, "description");
      const status = getValueByHeader(row, headers, "status") || "draft";

      if (!title) {
        result.errors.push({ row: rowNum, message: "Title is required" });
        continue;
      }

      if (!diseaseCategory) {
        result.errors.push({ row: rowNum, message: "Disease category is required" });
        continue;
      }

      if (isNaN(tokenBudget) || tokenBudget < 0) {
        result.errors.push({ row: rowNum, message: "Token budget must be a valid positive number" });
        continue;
      }

      // Check for existing study
      const { data: existing } = await supabase
        .from("research_broadcast_requests")
        .select("id")
        .eq("researcher_id", researcherId)
        .eq("title", title)
        .maybeSingle();

      if (existing) {
        if (conflictResolution === "skip") {
          result.skipped++;
          continue;
        } else if (conflictResolution === "merge" || conflictResolution === "replace") {
          const { error } = await supabase
            .from("research_broadcast_requests")
            .update({
              disease_category: diseaseCategory,
              token_budget: tokenBudget,
              tokens_per_patient: tokensPerPatient,
              description,
              status,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) {
            result.errors.push({ row: rowNum, message: error.message });
          } else {
            result.updated++;
          }
          continue;
        }
      }

      // Insert new study
      const { error } = await supabase.from("research_broadcast_requests").insert({
        researcher_id: researcherId,
        title,
        disease_category: diseaseCategory,
        token_budget: tokenBudget,
        tokens_per_patient: tokensPerPatient,
        description,
        status,
      });

      if (error) {
        result.errors.push({ row: rowNum, message: error.message });
      } else {
        result.imported++;
      }
    } catch (err) {
      result.errors.push({ row: rowNum, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return result;
}

async function importParticipantCohorts(
  supabase: ReturnType<typeof createClient>,
  researcherId: string,
  headers: string[],
  rows: string[][],
  conflictResolution: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  };

  const requiredHeaders = ["patient_email"];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(", ")}`);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const patientEmail = getValueByHeader(row, headers, "patient_email");
      const patientGhpid = getValueByHeader(row, headers, "patient_ghpid");
      const diseaseCategory = getValueByHeader(row, headers, "disease_category");
      const reason = getValueByHeader(row, headers, "reason") || "Research study participation";
      const tokenOffer = parseInt(getValueByHeader(row, headers, "token_offer") || "10", 10);

      if (!patientEmail && !patientGhpid) {
        result.errors.push({ row: rowNum, message: "Patient email or GHPID is required" });
        continue;
      }

      // Find patient by email or GHPID
      let patientId: string | null = null;

      if (patientGhpid) {
        const { data: profileByGhpid } = await supabase
          .from("user_profiles")
          .select("user_id")
          .eq("patient_passport_id", patientGhpid)
          .maybeSingle();
        if (profileByGhpid) {
          patientId = profileByGhpid.user_id;
        }
      }

      if (!patientId && patientEmail) {
        const { data: userId } = await supabase.rpc("get_user_id_by_email", { p_email: patientEmail });
        if (userId) {
          patientId = userId;
        }
      }

      if (!patientId) {
        result.warnings.push({ 
          row: rowNum, 
          message: `Patient not found: ${patientEmail || patientGhpid}. They may need to register on the platform.` 
        });
        result.skipped++;
        continue;
      }

      // Check for existing request
      const { data: existing } = await supabase
        .from("data_access_requests")
        .select("id, status")
        .eq("requester_id", researcherId)
        .eq("patient_id", patientId)
        .eq("requester_type", "researcher")
        .maybeSingle();

      if (existing) {
        if (conflictResolution === "skip") {
          result.skipped++;
          continue;
        } else if (conflictResolution === "merge" || conflictResolution === "replace") {
          // Only update if not already approved
          if (existing.status !== "approved") {
            const { error } = await supabase
              .from("data_access_requests")
              .update({
                disease_category: diseaseCategory || null,
                reason,
                token_offer: tokenOffer,
              })
              .eq("id", existing.id);

            if (error) {
              result.errors.push({ row: rowNum, message: error.message });
            } else {
              result.updated++;
            }
          } else {
            result.warnings.push({ row: rowNum, message: "Existing approved request unchanged" });
            result.skipped++;
          }
          continue;
        }
      }

      // Insert new request
      const { error } = await supabase.from("data_access_requests").insert({
        requester_id: researcherId,
        patient_id: patientId,
        requester_type: "researcher",
        disease_category: diseaseCategory || null,
        reason,
        token_offer: tokenOffer,
        status: "pending",
      });

      if (error) {
        result.errors.push({ row: rowNum, message: error.message });
      } else {
        result.imported++;

        // Notify patient
        await supabase.from("notifications").insert({
          user_id: patientId,
          type: "data_request",
          title: "Data Access Request",
          message: `A researcher is requesting access to your health data for research purposes.`,
          metadata: { requester_type: "researcher", reason },
        });
      }
    } catch (err) {
      result.errors.push({ row: rowNum, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return result;
}

async function importStudyNotes(
  supabase: ReturnType<typeof createClient>,
  researcherId: string,
  headers: string[],
  rows: string[][],
  conflictResolution: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  };

  const requiredHeaders = ["study_title"];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(", ")}`);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const studyTitle = getValueByHeader(row, headers, "study_title");
      const methodology = getValueByHeader(row, headers, "methodology");
      const findings = getValueByHeader(row, headers, "findings");
      const sampleSize = parseInt(getValueByHeader(row, headers, "sample_size") || "0", 10);
      const isPublished = getValueByHeader(row, headers, "is_published")?.toLowerCase() === "true";
      const publicationUrl = getValueByHeader(row, headers, "publication_url");

      if (!studyTitle) {
        result.errors.push({ row: rowNum, message: "Study title is required" });
        continue;
      }

      // Check for existing note
      const { data: existing } = await supabase
        .from("researcher_study_notes")
        .select("id")
        .eq("researcher_id", researcherId)
        .eq("study_title", studyTitle)
        .maybeSingle();

      if (existing) {
        if (conflictResolution === "skip") {
          result.skipped++;
          continue;
        } else if (conflictResolution === "merge" || conflictResolution === "replace") {
          const { error } = await supabase
            .from("researcher_study_notes")
            .update({
              methodology,
              findings,
              sample_size: sampleSize || null,
              is_published: isPublished,
              publication_url: publicationUrl || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) {
            result.errors.push({ row: rowNum, message: error.message });
          } else {
            result.updated++;
          }
          continue;
        }
      }

      // Insert new note
      const { error } = await supabase.from("researcher_study_notes").insert({
        researcher_id: researcherId,
        study_title: studyTitle,
        methodology,
        findings,
        sample_size: sampleSize || null,
        is_published: isPublished,
        publication_url: publicationUrl || null,
      });

      if (error) {
        result.errors.push({ row: rowNum, message: error.message });
      } else {
        result.imported++;
      }
    } catch (err) {
      result.errors.push({ row: rowNum, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Verify researcher profile exists
    const { data: researcherProfile } = await supabaseClient
      .from("researcher_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!researcherProfile) {
      throw new Error("Researcher profile not found");
    }

    const body: ImportRequest = await req.json();
    const { importType, csvContent, conflictResolution, options } = body;

    if (!csvContent || !importType) {
      throw new Error("Missing required fields: csvContent and importType");
    }

    console.log(`Starting ${importType} import for researcher ${user.id}`);

    const { headers, rows } = parseCSV(csvContent);

    let result: ImportResult;

    switch (importType) {
      case "research_studies":
        result = await importResearchStudies(supabaseClient, user.id, headers, rows, conflictResolution);
        break;
      case "participant_cohorts":
        result = await importParticipantCohorts(supabaseClient, user.id, headers, rows, conflictResolution);
        break;
      case "study_notes":
        result = await importStudyNotes(supabaseClient, user.id, headers, rows, conflictResolution);
        break;
      default:
        throw new Error(`Unknown import type: ${importType}`);
    }

    // Log import activity
    await supabaseClient.from("provider_import_logs").insert({
      provider_id: user.id,
      provider_type: "researcher",
      import_type: importType,
      records_imported: result.imported,
      records_updated: result.updated,
      records_skipped: result.skipped,
      errors_count: result.errors.length,
      status: result.errors.length === 0 ? "completed" : "completed_with_errors",
    });

    console.log(`Import completed: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "An error occurred processing your request" 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
