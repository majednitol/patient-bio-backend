import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ImportRequest {
  importType: "test_catalog" | "report_templates" | "historical_reports";
  csvContent: string;
  conflictResolution: "merge" | "replace" | "skip";
  options?: {
    deactivateUnlisted?: boolean;
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

// Built-in template IDs that are valid
const BUILT_IN_TEMPLATES = [
  "cbc", "lft", "kft", "lipid", "thyroid", "hba1c", "urine", "covid", "ecg", "xray", "blank"
];

function parseCSV(csvContent: string): { headers: string[]; rows: string[][] } {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV must have at least a header row and one data row");
  }

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCSVLine(line));

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function getColumnIndex(headers: string[], ...possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(
      (h) => h.toLowerCase().replace(/[_\s-]/g, "") === name.toLowerCase().replace(/[_\s-]/g, "")
    );
    if (index !== -1) return index;
  }
  return -1;
}

async function importTestCatalog(
  supabase: ReturnType<typeof createClient>,
  pathologistId: string,
  csvData: { headers: string[]; rows: string[][] },
  conflictResolution: string,
  options?: { deactivateUnlisted?: boolean }
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  };

  // Get column indices
  const codeIdx = getColumnIndex(csvData.headers, "test_code", "code");
  const nameIdx = getColumnIndex(csvData.headers, "name", "test_name");
  const categoryIdx = getColumnIndex(csvData.headers, "category");
  const sampleTypeIdx = getColumnIndex(csvData.headers, "sample_type", "sampletype");
  const priceIdx = getColumnIndex(csvData.headers, "price", "cost");
  const turnaroundIdx = getColumnIndex(csvData.headers, "turnaround_time", "turnaround", "turnaround_days");
  const prepIdx = getColumnIndex(csvData.headers, "preparation_instructions", "preparation", "prep");
  const refRangeIdx = getColumnIndex(csvData.headers, "reference_ranges", "reference_range", "reference");
  const templateIdx = getColumnIndex(csvData.headers, "template_id", "template");

  // Validate required columns
  if (nameIdx === -1) {
    return { ...result, success: false, errors: [{ row: 0, message: "Missing required column: name" }] };
  }

  // Get existing tests for this pathologist
  const { data: existingTests } = await supabase
    .from("pathologist_tests")
    .select("id, code, name")
    .eq("pathologist_id", pathologistId);

  const existingByCode = new Map(
    (existingTests || []).filter((t) => t.code).map((t) => [t.code.toLowerCase(), t])
  );
  const existingByName = new Map(
    (existingTests || []).map((t) => [t.name.toLowerCase(), t])
  );

  const importedCodes = new Set<string>();

  for (let i = 0; i < csvData.rows.length; i++) {
    const row = csvData.rows[i];
    const rowNum = i + 2; // 1-indexed, accounting for header

    try {
      const code = codeIdx !== -1 ? row[codeIdx]?.trim() : "";
      const name = row[nameIdx]?.trim();
      
      if (!name) {
        result.errors.push({ row: rowNum, message: "Missing test name" });
        continue;
      }

      const price = priceIdx !== -1 ? parseFloat(row[priceIdx]) : null;
      if (priceIdx !== -1 && row[priceIdx] && isNaN(price!)) {
        result.errors.push({ row: rowNum, message: `Invalid price: ${row[priceIdx]}` });
        continue;
      }

      const templateId = templateIdx !== -1 ? row[templateIdx]?.trim().toLowerCase() : null;
      if (templateId && !BUILT_IN_TEMPLATES.includes(templateId)) {
        result.warnings.push({ row: rowNum, message: `Unknown template_id '${templateId}', using blank` });
      }

      const testData = {
        pathologist_id: pathologistId,
        code: code || null,
        name,
        category: categoryIdx !== -1 ? row[categoryIdx]?.trim() || null : null,
        sample_type: sampleTypeIdx !== -1 ? row[sampleTypeIdx]?.trim() || null : null,
        price: price || null,
        turnaround_time: turnaroundIdx !== -1 ? row[turnaroundIdx]?.trim() || null : null,
        preparation_instructions: prepIdx !== -1 ? row[prepIdx]?.trim() || null : null,
        reference_ranges: refRangeIdx !== -1 ? row[refRangeIdx]?.trim() || null : null,
        template_id: templateId && BUILT_IN_TEMPLATES.includes(templateId) ? templateId : null,
        is_active: true,
      };

      // Check for existing test
      const existingByCodeMatch = code ? existingByCode.get(code.toLowerCase()) : null;
      const existingByNameMatch = existingByName.get(name.toLowerCase());
      const existing = existingByCodeMatch || existingByNameMatch;

      if (existing) {
        if (conflictResolution === "skip") {
          result.skipped++;
          if (code) importedCodes.add(code.toLowerCase());
          continue;
        } else if (conflictResolution === "merge" || conflictResolution === "replace") {
          const { error } = await supabase
            .from("pathologist_tests")
            .update(testData)
            .eq("id", existing.id);

          if (error) {
            result.errors.push({ row: rowNum, message: error.message });
          } else {
            result.updated++;
            if (code) importedCodes.add(code.toLowerCase());
          }
        }
      } else {
        const { error } = await supabase.from("pathologist_tests").insert(testData);

        if (error) {
          result.errors.push({ row: rowNum, message: error.message });
        } else {
          result.imported++;
          if (code) importedCodes.add(code.toLowerCase());
        }
      }
    } catch (err) {
      result.errors.push({ row: rowNum, message: `Processing error: ${err}` });
    }
  }

  // Deactivate unlisted tests if requested
  if (options?.deactivateUnlisted && importedCodes.size > 0) {
    const { data: allTests } = await supabase
      .from("pathologist_tests")
      .select("id, code")
      .eq("pathologist_id", pathologistId)
      .eq("is_active", true);

    for (const test of allTests || []) {
      if (test.code && !importedCodes.has(test.code.toLowerCase())) {
        await supabase
          .from("pathologist_tests")
          .update({ is_active: false })
          .eq("id", test.id);
      }
    }
  }

  return result;
}

async function importReportTemplates(
  supabase: ReturnType<typeof createClient>,
  pathologistId: string,
  csvData: { headers: string[]; rows: string[][] },
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

  const nameIdx = getColumnIndex(csvData.headers, "name", "template_name");
  const categoryIdx = getColumnIndex(csvData.headers, "category");
  const testTypeIdx = getColumnIndex(csvData.headers, "test_type", "testtype");
  const structureIdx = getColumnIndex(csvData.headers, "template_structure", "structure");

  if (nameIdx === -1 || structureIdx === -1) {
    return {
      ...result,
      success: false,
      errors: [{ row: 0, message: "Missing required columns: name, template_structure" }],
    };
  }

  // Get existing templates
  const { data: existingTemplates } = await supabase
    .from("pathologist_report_templates")
    .select("id, name")
    .eq("pathologist_id", pathologistId);

  const existingByName = new Map(
    (existingTemplates || []).map((t) => [t.name.toLowerCase(), t])
  );

  for (let i = 0; i < csvData.rows.length; i++) {
    const row = csvData.rows[i];
    const rowNum = i + 2;

    try {
      const name = row[nameIdx]?.trim();
      const structureStr = row[structureIdx]?.trim();

      if (!name) {
        result.errors.push({ row: rowNum, message: "Missing template name" });
        continue;
      }

      if (!structureStr) {
        result.errors.push({ row: rowNum, message: "Missing template_structure" });
        continue;
      }

      let templateStructure: object;
      try {
        templateStructure = JSON.parse(structureStr);
      } catch {
        result.errors.push({ row: rowNum, message: "Invalid JSON in template_structure" });
        continue;
      }

      const templateData = {
        pathologist_id: pathologistId,
        name,
        category: categoryIdx !== -1 ? row[categoryIdx]?.trim() || null : null,
        test_type: testTypeIdx !== -1 ? row[testTypeIdx]?.trim() || null : null,
        template_structure: templateStructure,
        is_active: true,
      };

      const existing = existingByName.get(name.toLowerCase());

      if (existing) {
        if (conflictResolution === "skip") {
          result.skipped++;
          continue;
        } else {
          const { error } = await supabase
            .from("pathologist_report_templates")
            .update(templateData)
            .eq("id", existing.id);

          if (error) {
            result.errors.push({ row: rowNum, message: error.message });
          } else {
            result.updated++;
          }
        }
      } else {
        const { error } = await supabase
          .from("pathologist_report_templates")
          .insert(templateData);

        if (error) {
          result.errors.push({ row: rowNum, message: error.message });
        } else {
          result.imported++;
        }
      }
    } catch (err) {
      result.errors.push({ row: rowNum, message: `Processing error: ${err}` });
    }
  }

  return result;
}

async function importHistoricalReports(
  supabase: ReturnType<typeof createClient>,
  pathologistId: string,
  csvData: { headers: string[]; rows: string[][] },
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

  const emailIdx = getColumnIndex(csvData.headers, "patient_email", "email");
  const ghpidIdx = getColumnIndex(csvData.headers, "ghpid", "patient_id", "passport_id");
  const dateIdx = getColumnIndex(csvData.headers, "report_date", "date");
  const nameIdx = getColumnIndex(csvData.headers, "report_name", "name");
  const typeIdx = getColumnIndex(csvData.headers, "report_type", "type");
  const categoryIdx = getColumnIndex(csvData.headers, "disease_category", "category");
  const findingsIdx = getColumnIndex(csvData.headers, "findings", "results");

  if (nameIdx === -1) {
    return {
      ...result,
      success: false,
      errors: [{ row: 0, message: "Missing required column: report_name" }],
    };
  }

  // Build patient lookup cache
  const { data: patients } = await supabase
    .from("user_profiles")
    .select("id, patient_passport_id, user_id");

  const { data: users } = await supabase.auth.admin.listUsers();

  const patientByGhpid = new Map<string, string>();
  const patientByEmail = new Map<string, string>();

  for (const profile of patients || []) {
    if (profile.patient_passport_id) {
      patientByGhpid.set(profile.patient_passport_id.toLowerCase(), profile.user_id);
    }
  }

  for (const user of users?.users || []) {
    if (user.email) {
      patientByEmail.set(user.email.toLowerCase(), user.id);
    }
  }

  for (let i = 0; i < csvData.rows.length; i++) {
    const row = csvData.rows[i];
    const rowNum = i + 2;

    try {
      const ghpid = ghpidIdx !== -1 ? row[ghpidIdx]?.trim() : "";
      const email = emailIdx !== -1 ? row[emailIdx]?.trim() : "";
      const reportName = row[nameIdx]?.trim();

      if (!reportName) {
        result.errors.push({ row: rowNum, message: "Missing report name" });
        continue;
      }

      // Match patient
      let patientId: string | undefined;
      if (ghpid) {
        patientId = patientByGhpid.get(ghpid.toLowerCase());
      }
      if (!patientId && email) {
        patientId = patientByEmail.get(email.toLowerCase());
      }

      if (!patientId) {
        result.warnings.push({
          row: rowNum,
          message: `Patient not found (${email || ghpid || "no identifier"}) - skipped`,
        });
        result.skipped++;
        continue;
      }

      const reportDate = dateIdx !== -1 && row[dateIdx] ? row[dateIdx].trim() : new Date().toISOString();

      const reportData = {
        pathologist_id: pathologistId,
        patient_id: patientId,
        report_name: reportName,
        report_type: typeIdx !== -1 ? row[typeIdx]?.trim() || "general" : "general",
        disease_category: categoryIdx !== -1 ? row[categoryIdx]?.trim() || null : null,
        findings: findingsIdx !== -1 ? row[findingsIdx]?.trim() || null : null,
        status: "completed",
        created_at: reportDate,
      };

      const { error } = await supabase.from("pathologist_reports").insert(reportData);

      if (error) {
        result.errors.push({ row: rowNum, message: error.message });
      } else {
        result.imported++;
      }
    } catch (err) {
      result.errors.push({ row: rowNum, message: `Processing error: ${err}` });
    }
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pathologistId = userData.user.id;

    // Verify pathologist role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", pathologistId)
      .eq("role", "pathologist")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not authorized as pathologist" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ImportRequest = await req.json();
    const { importType, csvContent, conflictResolution, options } = body;

    if (!importType || !csvContent) {
      return new Response(JSON.stringify({ error: "Missing importType or csvContent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse CSV
    let csvData: { headers: string[]; rows: string[][] };
    try {
      csvData = parseCSV(csvContent);
    } catch (err) {
      return new Response(JSON.stringify({ error: `CSV parsing error: ${err}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[import-pathologist-data] Processing ${importType} import for ${pathologistId}`);
    console.log(`[import-pathologist-data] CSV has ${csvData.rows.length} rows`);

    // Log the import
    const { data: importLog } = await supabase
      .from("provider_import_logs")
      .insert({
        provider_id: pathologistId,
        provider_type: "pathologist",
        import_type: importType,
        file_name: `${importType}_import.csv`,
        total_records: csvData.rows.length,
        status: "processing",
      })
      .select()
      .single();

    let result: ImportResult;

    switch (importType) {
      case "test_catalog":
        result = await importTestCatalog(supabase, pathologistId, csvData, conflictResolution, options);
        break;
      case "report_templates":
        result = await importReportTemplates(supabase, pathologistId, csvData, conflictResolution);
        break;
      case "historical_reports":
        result = await importHistoricalReports(supabase, pathologistId, csvData, conflictResolution);
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid import type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Update import log
    if (importLog) {
      await supabase
        .from("provider_import_logs")
        .update({
          imported_records: result.imported,
          skipped_records: result.skipped,
          failed_records: result.errors.length,
          status: result.errors.length > 0 && result.imported === 0 ? "failed" : "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", importLog.id);
    }

    console.log(`[import-pathologist-data] Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[import-pathologist-data] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
