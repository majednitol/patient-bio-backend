import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportResult {
  success: boolean;
  resourceType: string;
  action: string;
  details?: string;
  error?: string;
}

interface ImportSummary {
  totalRecords: number;
  imported: number;
  skipped: number;
  errors: number;
  results: ImportResult[];
}

// Parse CSV line by line
function parseCSV(content: string): string[][] {
  const lines = content.trim().split('\n');
  const rows: string[][] = [];
  
  for (const line of lines) {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    cells.push(current.trim());
    if (cells.some(c => c.length > 0)) {
      rows.push(cells);
    }
  }
  
  return rows;
}

// Import prescription templates
async function importPrescriptionTemplates(
  supabase: any,
  doctorId: string,
  data: Record<string, any>[],
  conflictResolution: string
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  
  for (const row of data) {
    try {
      const name = row.template_name || row.name;
      if (!name) {
        results.push({
          success: true,
          resourceType: "PrescriptionTemplate",
          action: "skipped",
          details: "No template name provided",
        });
        continue;
      }
      
      // Parse medications
      let medications: any[] = [];
      if (row.medications) {
        try {
          medications = typeof row.medications === 'string' 
            ? JSON.parse(row.medications) 
            : row.medications;
        } catch {
          medications = [];
        }
      }
      
      // Check for existing
      const { data: existing } = await supabase
        .from("prescription_templates")
        .select("id")
        .eq("doctor_id", doctorId)
        .eq("name", name)
        .maybeSingle();
      
      if (existing && conflictResolution === "skip") {
        results.push({
          success: true,
          resourceType: "PrescriptionTemplate",
          action: "skipped",
          details: "Template already exists",
        });
        continue;
      }
      
      // Insert or update
      const { error } = await supabase
        .from("prescription_templates")
        .upsert(
          {
            doctor_id: doctorId,
            name,
            diagnosis: row.diagnosis || null,
            medications: medications as any,
            instructions: row.instructions || null,
          },
          { onConflict: "doctor_id,name" }
        );
      
      if (error) throw error;
      
      results.push({
        success: true,
        resourceType: "PrescriptionTemplate",
        action: "imported",
        details: name,
      });
    } catch (error: any) {
      results.push({
        success: false,
        resourceType: "PrescriptionTemplate",
        action: "error",
        error: error.message,
      });
    }
  }
  
  return results;
}

// Import patient list (creates data access requests)
async function importPatientList(
  supabase: any,
  doctorId: string,
  data: Record<string, any>[],
  conflictResolution: string
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  
  for (const row of data) {
    try {
      const patientEmail = row.patient_email || row.email;
      const patientName = row.patient_name || row.name;
      
      if (!patientEmail) {
        results.push({
          success: true,
          resourceType: "PatientConnection",
          action: "skipped",
          details: "No patient email provided",
        });
        continue;
      }
      
      // Look up patient by email
      const { data: patientData, error: lookupError } = await supabase
        .rpc("get_user_id_by_email", { p_email: patientEmail });
      
      if (lookupError || !patientData) {
        results.push({
          success: true,
          resourceType: "PatientConnection",
          action: "skipped",
          details: `Patient with email ${patientEmail} not found`,
        });
        continue;
      }
      
      const patientId = patientData;
      
      // Check if connection already exists
      const { data: existing } = await supabase
        .from("doctor_connections")
        .select("id")
        .eq("user_id", patientId)
        .eq("email", patientEmail)
        .maybeSingle();
      
      if (existing && conflictResolution === "skip") {
        results.push({
          success: true,
          resourceType: "PatientConnection",
          action: "skipped",
          details: "Connection already exists",
        });
        continue;
      }
      
      // Create or update doctor connection
      const { error } = await supabase
        .from("doctor_connections")
        .upsert(
          {
            user_id: patientId,
            doctor_name: row.doctor_name || "",
            email: patientEmail,
            specialty: row.specialty || null,
            phone: row.phone || null,
            hospital_clinic: row.hospital || null,
            notes: row.notes || null,
          },
          { onConflict: "user_id,email" }
        );
      
      if (error) throw error;
      
      results.push({
        success: true,
        resourceType: "PatientConnection",
        action: "imported",
        details: patientEmail,
      });
    } catch (error: any) {
      results.push({
        success: false,
        resourceType: "PatientConnection",
        action: "error",
        error: error.message,
      });
    }
  }
  
  return results;
}

// Import clinical notes
async function importClinicalNotes(
  supabase: any,
  doctorId: string,
  data: Record<string, any>[],
  conflictResolution: string
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  
  for (const row of data) {
    try {
      const patientEmail = row.patient_email || row.email;
      const noteContent = row.note || row.notes;
      
      if (!patientEmail || !noteContent) {
        results.push({
          success: true,
          resourceType: "ClinicalNote",
          action: "skipped",
          details: "Missing patient email or note content",
        });
        continue;
      }
      
      // Look up patient
      const { data: patientData } = await supabase
        .rpc("get_user_id_by_email", { p_email: patientEmail });
      
      if (!patientData) {
        results.push({
          success: true,
          resourceType: "ClinicalNote",
          action: "skipped",
          details: `Patient ${patientEmail} not found`,
        });
        continue;
      }
      
      const patientId = patientData;
      
      // Insert note
      const { error } = await supabase
        .from("doctor_patient_notes")
        .insert({
          doctor_id: doctorId,
          patient_id: patientId,
          note: noteContent,
          is_pinned: row.is_pinned === 'true' || row.is_pinned === true,
        });
      
      if (error) throw error;
      
      results.push({
        success: true,
        resourceType: "ClinicalNote",
        action: "imported",
        details: `Note for ${patientEmail}`,
      });
    } catch (error: any) {
      results.push({
        success: false,
        resourceType: "ClinicalNote",
        action: "error",
        error: error.message,
      });
    }
  }
  
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { csvContent, importType, conflictResolution = "merge", sourceFilename } = await req.json();

    if (!csvContent || !importType) {
      return new Response(
        JSON.stringify({ error: "Missing csvContent or importType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse CSV
    const rows = parseCSV(csvContent);
    if (rows.length < 2) {
      return new Response(
        JSON.stringify({ error: "CSV must contain header row and at least one data row" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers = rows[0];
    const dataRows: Record<string, any>[] = rows.slice(1).map((row) => {
      const obj: Record<string, any> = {};
      headers.forEach((header, idx) => {
        obj[header.toLowerCase().replace(/\s+/g, '_')] = row[idx] || '';
      });
      return obj;
    });

    // Create import log
    const { data: importLog } = await supabase
      .from("provider_import_logs")
      .insert({
        provider_type: "doctor",
        provider_id: user.id,
        import_type: importType,
        source_format: "csv",
        source_filename: sourceFilename || "import.csv",
        total_records: dataRows.length,
        status: "processing",
        metadata: { conflict_resolution: conflictResolution },
      })
      .select()
      .single();

    // Process based on type
    let summary: ImportSummary = {
      totalRecords: dataRows.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      results: [],
    };

    let results: ImportResult[] = [];
    
    switch (importType) {
      case "templates":
        results = await importPrescriptionTemplates(supabase, user.id, dataRows, conflictResolution);
        break;
      case "patients":
        results = await importPatientList(supabase, user.id, dataRows, conflictResolution);
        break;
      case "notes":
        results = await importClinicalNotes(supabase, user.id, dataRows, conflictResolution);
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Unknown importType" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    summary.results = results;
    summary.imported = results.filter(r => r.action === "imported").length;
    summary.skipped = results.filter(r => r.action === "skipped").length;
    summary.errors = results.filter(r => r.action === "error").length;

    // Update import log
    if (importLog) {
      await supabase
        .from("provider_import_logs")
        .update({
          imported_count: summary.imported,
          skipped_count: summary.skipped,
          error_count: summary.errors,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", importLog.id);

      for (const result of results) {
        await supabase.from("provider_import_records").insert({
          import_log_id: importLog.id,
          source_row_number: summary.results.indexOf(result),
          source_data: result,
          target_table: result.resourceType.toLowerCase(),
          status: result.success ? (result.action === "skipped" ? "skipped" : "success") : "error",
          error_message: result.error || null,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: summary.totalRecords,
          imported: summary.imported,
          skipped: summary.skipped,
          errors: summary.errors,
        },
        details: summary.results,
        importLogId: importLog?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Doctor data import error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
