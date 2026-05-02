import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HL7Segment {
  name: string;
  fields: string[];
}

interface ParsedMessage {
  segments: HL7Segment[];
  messageType: string;
  messageControlId: string;
  sendingApplication: string;
  sendingFacility: string;
  messageDateTime: string;
}

interface ImportResult {
  success: boolean;
  resourceType: string;
  action: string;
  details?: string;
  error?: string;
}

// Parse HL7v2 message into segments
function parseHL7Message(message: string): ParsedMessage {
  // Normalize line endings and split into segments
  const lines = message.replace(/\r\n/g, "\r").replace(/\n/g, "\r").split("\r").filter(Boolean);
  
  const segments: HL7Segment[] = [];
  let fieldSeparator = "|";
  
  for (const line of lines) {
    if (line.startsWith("MSH")) {
      // MSH segment defines the field separator as the 4th character
      fieldSeparator = line[3] || "|";
    }
    
    const fields = line.split(fieldSeparator);
    const segmentName = fields[0];
    
    // For MSH, the field separator counts as field 1
    if (segmentName === "MSH") {
      fields.splice(1, 0, fieldSeparator);
    }
    
    segments.push({
      name: segmentName,
      fields,
    });
  }

  // Extract header information
  const msh = segments.find((s) => s.name === "MSH");
  const messageType = msh?.fields[9]?.split("^").slice(0, 2).join("^") || "UNKNOWN";
  const messageControlId = msh?.fields[10] || "";
  const sendingApplication = msh?.fields[3] || "";
  const sendingFacility = msh?.fields[4] || "";
  const messageDateTime = msh?.fields[7] || "";

  return {
    segments,
    messageType,
    messageControlId,
    sendingApplication,
    sendingFacility,
    messageDateTime,
  };
}

// Parse HL7 date/time to ISO format
function parseHL7DateTime(hl7Date: string): string | null {
  if (!hl7Date) return null;
  
  // Format: YYYYMMDDHHMMSS or YYYYMMDD
  const year = hl7Date.substring(0, 4);
  const month = hl7Date.substring(4, 6) || "01";
  const day = hl7Date.substring(6, 8) || "01";
  const hour = hl7Date.substring(8, 10) || "00";
  const minute = hl7Date.substring(10, 12) || "00";
  const second = hl7Date.substring(12, 14) || "00";

  try {
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
  } catch {
    return null;
  }
}

// Extract patient information from PID segment
function extractPatientInfo(pid: HL7Segment): Record<string, unknown> {
  const patientId = pid.fields[3]?.split("^")[0] || "";
  const nameField = pid.fields[5] || "";
  const nameParts = nameField.split("^");
  
  return {
    patientId,
    lastName: nameParts[0] || "",
    firstName: nameParts[1] || "",
    middleName: nameParts[2] || "",
    dateOfBirth: parseHL7DateTime(pid.fields[7] || ""),
    gender: pid.fields[8] || "",
    address: pid.fields[11]?.split("^").filter(Boolean).join(", ") || "",
    phone: pid.fields[13] || "",
    ssn: pid.fields[19] || "",
  };
}

// Extract observation results from OBX segments (for ORU messages)
function extractObservations(segments: HL7Segment[]): Array<Record<string, unknown>> {
  const observations: Array<Record<string, unknown>> = [];
  
  const obxSegments = segments.filter((s) => s.name === "OBX");
  
  for (const obx of obxSegments) {
    const valueType = obx.fields[2] || "";
    const observationId = obx.fields[3] || "";
    const idParts = observationId.split("^");
    
    observations.push({
      setId: obx.fields[1] || "",
      valueType,
      observationCode: idParts[0] || "",
      observationName: idParts[1] || "",
      codingSystem: idParts[2] || "",
      value: obx.fields[5] || "",
      units: obx.fields[6]?.split("^")[0] || "",
      referenceRange: obx.fields[7] || "",
      abnormalFlags: obx.fields[8] || "",
      resultStatus: obx.fields[11] || "",
      observationDateTime: parseHL7DateTime(obx.fields[14] || ""),
    });
  }
  
  return observations;
}

// Extract diagnosis information from DG1 segments
function extractDiagnoses(segments: HL7Segment[]): Array<Record<string, unknown>> {
  const diagnoses: Array<Record<string, unknown>> = [];
  
  const dg1Segments = segments.filter((s) => s.name === "DG1");
  
  for (const dg1 of dg1Segments) {
    const diagnosisCode = dg1.fields[3] || "";
    const codeParts = diagnosisCode.split("^");
    
    diagnoses.push({
      setId: dg1.fields[1] || "",
      diagnosisCode: codeParts[0] || "",
      diagnosisDescription: codeParts[1] || "",
      codingSystem: codeParts[2] || "",
      diagnosisType: dg1.fields[6] || "",
      diagnosisDateTime: parseHL7DateTime(dg1.fields[5] || ""),
    });
  }
  
  return diagnoses;
}

// Import patient data from ADT message
async function importADTMessage(
  supabase: any,
  userId: string,
  parsed: ParsedMessage
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  
  const pid = parsed.segments.find((s) => s.name === "PID");
  if (!pid) {
    return [{ success: false, resourceType: "Patient", action: "error", error: "No PID segment found" }];
  }

  const patientInfo = extractPatientInfo(pid);
  
  // Update user profile with patient info
  try {
    const displayName = [patientInfo.firstName, patientInfo.lastName].filter(Boolean).join(" ");
    
    const updates: Record<string, unknown> = {};
    if (displayName) updates.display_name = displayName;
    if (patientInfo.dateOfBirth) updates.date_of_birth = patientInfo.dateOfBirth.split("T")[0];
    if (patientInfo.gender) {
      const genderMap: Record<string, string> = { M: "male", F: "female", O: "other", U: "unknown" };
      updates.gender = genderMap[patientInfo.gender as string] || patientInfo.gender;
    }
    if (patientInfo.address) updates.address = patientInfo.address;
    if (patientInfo.phone) updates.phone = patientInfo.phone;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("user_id", userId);

      if (error) throw error;
      results.push({ success: true, resourceType: "Patient", action: "updated", details: `Updated ${Object.keys(updates).join(", ")}` });
    } else {
      results.push({ success: true, resourceType: "Patient", action: "skipped", details: "No mappable data" });
    }
  } catch (error: any) {
    results.push({ success: false, resourceType: "Patient", action: "error", error: error.message });
  }

  // Extract diagnoses
  const diagnoses = extractDiagnoses(parsed.segments);
  for (const diagnosis of diagnoses) {
    try {
      // Add to chronic diseases or conditions
      const { data: healthData } = await supabase
        .from("health_data")
        .select("chronic_diseases")
        .eq("user_id", userId)
        .single();

      const existing = healthData?.chronic_diseases || "";
      const diagnosisText = `${diagnosis.diagnosisDescription || diagnosis.diagnosisCode}`;
      
      if (!existing.toLowerCase().includes(diagnosisText.toLowerCase())) {
        const newValue = existing ? `${existing}, ${diagnosisText}` : diagnosisText;
        
        await supabase
          .from("health_data")
          .upsert({ user_id: userId, chronic_diseases: newValue }, { onConflict: "user_id" });
        
        results.push({ success: true, resourceType: "Condition", action: "imported", details: diagnosisText });
      } else {
        results.push({ success: true, resourceType: "Condition", action: "skipped", details: "Already exists" });
      }
    } catch (error: any) {
      results.push({ success: false, resourceType: "Condition", action: "error", error: error.message });
    }
  }

  return results;
}

// Import lab results from ORU message
async function importORUMessage(
  supabase: any,
  userId: string,
  parsed: ParsedMessage
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  
  const observations = extractObservations(parsed.segments);
  
  // Map common HL7 observation codes to metric types
  const codeToMetricType: Record<string, string> = {
    "8480-6": "systolic_bp",
    "8462-4": "diastolic_bp",
    "8867-4": "heart_rate",
    "9279-1": "respiratory_rate",
    "8310-5": "temperature",
    "2708-6": "oxygen_saturation",
    "29463-7": "weight",
    "8302-2": "height",
    "39156-5": "bmi",
    "2339-0": "blood_glucose",
    "2345-7": "blood_glucose", // Glucose [Mass/volume] in Blood
  };

  for (const obs of observations) {
    try {
      const metricType = codeToMetricType[obs.observationCode as string];
      
      if (metricType) {
        // Insert as health metric
        const value = parseFloat(obs.value as string);
        if (!isNaN(value)) {
          const { error } = await supabase.from("health_metrics").insert({
            user_id: userId,
            metric_type: metricType,
            value,
            unit: obs.units || "",
            measured_at: obs.observationDateTime || new Date().toISOString(),
            notes: `Imported from HL7v2 (${obs.observationName})`,
          });

          if (error) throw error;
          results.push({ success: true, resourceType: "Observation", action: "imported", details: metricType });
        } else {
          results.push({ success: true, resourceType: "Observation", action: "skipped", details: "Non-numeric value" });
        }
      } else {
        // Store as general observation in notes
        results.push({ 
          success: true, 
          resourceType: "Observation", 
          action: "skipped", 
          details: `Unknown code: ${obs.observationCode}` 
        });
      }
    } catch (error: any) {
      results.push({ success: false, resourceType: "Observation", action: "error", error: error.message });
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

    const { message, sourceFilename } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Missing HL7v2 message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the HL7v2 message
    const parsed = parseHL7Message(message);

    // Create import log
    const { data: importLog, error: logError } = await supabase
      .from("hl7v2_import_logs")
      .insert({
        user_id: user.id,
        message_type: parsed.messageType,
        message_control_id: parsed.messageControlId,
        sending_application: parsed.sendingApplication,
        sending_facility: parsed.sendingFacility,
        message_datetime: parseHL7DateTime(parsed.messageDateTime),
        raw_message: message,
        parsed_segments: parsed.segments,
        status: "processing",
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to create import log:", logError);
    }

    // Process based on message type
    let results: ImportResult[] = [];
    const messageTypePrefix = parsed.messageType.split("^")[0];

    switch (messageTypePrefix) {
      case "ADT":
        // Admit/Discharge/Transfer messages
        results = await importADTMessage(supabase, user.id, parsed);
        break;
      case "ORU":
        // Observation Result messages (lab results)
        results = await importORUMessage(supabase, user.id, parsed);
        break;
      case "ORM":
        // Order messages - not fully supported yet
        results = [{ success: true, resourceType: "Order", action: "skipped", details: "ORM messages not fully supported" }];
        break;
      default:
        results = [{ success: false, resourceType: "Unknown", action: "error", error: `Unsupported message type: ${parsed.messageType}` }];
    }

    // Calculate summary
    const summary = {
      total: results.length,
      imported: results.filter((r) => r.action === "imported" || r.action === "updated").length,
      skipped: results.filter((r) => r.action === "skipped").length,
      errors: results.filter((r) => r.action === "error").length,
    };

    // Update import log
    if (importLog) {
      const status = summary.errors === summary.total ? "failed" : 
                     summary.errors > 0 ? "partial" : "completed";
      
      await supabase
        .from("hl7v2_import_logs")
        .update({
          imported_resources: results,
          status,
          processed_at: new Date().toISOString(),
          warnings: results.filter((r) => r.action === "skipped").map((r) => r.details || ""),
          error_message: results.find((r) => r.action === "error")?.error,
        })
        .eq("id", importLog.id);
    }

    // Record provenance for imported resources
    for (const result of results.filter((r) => r.action === "imported" || r.action === "updated")) {
      try {
        await supabase.from("data_provenance").insert({
          user_id: user.id,
          target_resource_type: result.resourceType.toLowerCase(),
          target_resource_id: crypto.randomUUID(),
          activity_type: "import",
          agent_type: "system",
          source_system: "hl7v2_import",
          source_document: sourceFilename || `HL7v2 ${parsed.messageType}`,
          source_version: "2.x",
          metadata: {
            message_type: parsed.messageType,
            sending_application: parsed.sendingApplication,
            sending_facility: parsed.sendingFacility,
            import_details: result.details,
          },
        });
      } catch (provErr) {
        console.error("Failed to record provenance:", provErr);
      }
    }

    console.log(`HL7v2 import completed for user ${user.id}: ${parsed.messageType} - ${summary.imported} imported, ${summary.skipped} skipped, ${summary.errors} errors`);

    return new Response(
      JSON.stringify({
        success: summary.errors < summary.total,
        messageType: parsed.messageType,
        sendingApplication: parsed.sendingApplication,
        sendingFacility: parsed.sendingFacility,
        summary,
        results,
        importLogId: importLog?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("HL7v2 import error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
