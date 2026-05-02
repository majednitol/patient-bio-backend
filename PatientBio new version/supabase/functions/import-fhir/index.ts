import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FHIRResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

interface FHIRBundle {
  resourceType: "Bundle";
  type: string;
  entry?: Array<{ resource: FHIRResource }>;
}

interface ImportResult {
  success: boolean;
  resourceType: string;
  action: string;
  details?: string;
  error?: string;
}

interface ImportSummary {
  totalResources: number;
  imported: number;
  skipped: number;
  errors: number;
  results: ImportResult[];
}

// Extract text from CodeableConcept
function getCodeableConceptText(concept: any): string {
  if (!concept) return "";
  if (typeof concept === "string") return concept;
  if (concept.text) return concept.text;
  if (concept.coding?.[0]?.display) return concept.coding[0].display;
  if (concept.coding?.[0]?.code) return concept.coding[0].code;
  return "";
}

// Extract value from Observation
function extractObservationValue(observation: any): { value: number | null; unit: string } {
  if (observation.valueQuantity) {
    return {
      value: observation.valueQuantity.value,
      unit: observation.valueQuantity.unit || observation.valueQuantity.code || "",
    };
  }
  if (observation.valueString) {
    const parsed = parseFloat(observation.valueString);
    return { value: isNaN(parsed) ? null : parsed, unit: "" };
  }
  if (observation.valueInteger) {
    return { value: observation.valueInteger, unit: "" };
  }
  return { value: null, unit: "" };
}

// Map LOINC codes to metric types
function mapLoincToMetricType(coding: any[]): string | null {
  if (!coding) return null;
  
  const loincMap: Record<string, string> = {
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
  };
  
  for (const code of coding) {
    if (code.system === "http://loinc.org" && loincMap[code.code]) {
      return loincMap[code.code];
    }
  }
  
  return null;
}

// Process Patient resource
async function processPatient(
  supabase: any,
  userId: string,
  patient: any,
  conflictResolution: string
): Promise<ImportResult> {
  try {
    // Extract patient data
    const updates: Record<string, any> = {};
    
    if (patient.name?.[0]) {
      const name = patient.name[0];
      const displayName = [name.given?.join(" "), name.family].filter(Boolean).join(" ");
      if (displayName) updates.display_name = displayName;
    }
    
    if (patient.birthDate) {
      updates.date_of_birth = patient.birthDate;
    }
    
    if (patient.gender) {
      updates.gender = patient.gender;
    }
    
    if (patient.telecom) {
      const phone = patient.telecom.find((t: any) => t.system === "phone");
      if (phone?.value) updates.phone = phone.value;
    }
    
    if (patient.address?.[0]) {
      const addr = patient.address[0];
      const addressParts = [addr.line?.join(", "), addr.city, addr.state, addr.postalCode, addr.country];
      updates.address = addressParts.filter(Boolean).join(", ");
    }
    
    if (Object.keys(updates).length === 0) {
      return { success: true, resourceType: "Patient", action: "skipped", details: "No mappable data" };
    }
    
    // Check existing data
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, date_of_birth, gender, phone, address")
      .eq("user_id", userId)
      .single();
    
    if (existing && conflictResolution === "skip") {
      return { success: true, resourceType: "Patient", action: "skipped", details: "Profile exists" };
    }
    
    // Update profile
    const { error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("user_id", userId);
    
    if (error) throw error;
    
    return { success: true, resourceType: "Patient", action: "updated", details: `Updated ${Object.keys(updates).join(", ")}` };
  } catch (error: any) {
    return { success: false, resourceType: "Patient", action: "error", error: error.message };
  }
}

// Process Observation resource
async function processObservation(
  supabase: any,
  userId: string,
  observation: any,
  conflictResolution: string
): Promise<ImportResult> {
  try {
    const { value, unit } = extractObservationValue(observation);
    if (value === null) {
      return { success: true, resourceType: "Observation", action: "skipped", details: "No numeric value" };
    }
    
    const metricType = mapLoincToMetricType(observation.code?.coding);
    if (!metricType) {
      // Check if it's blood type
      const text = getCodeableConceptText(observation.code);
      if (text.toLowerCase().includes("blood") && text.toLowerCase().includes("type")) {
        const bloodValue = observation.valueCodeableConcept?.text || observation.valueString;
        if (bloodValue) {
          const { error } = await supabase
            .from("health_data")
            .upsert({ user_id: userId, blood_group: bloodValue }, { onConflict: "user_id" });
          
          if (error) throw error;
          return { success: true, resourceType: "Observation", action: "imported", details: "Blood group" };
        }
      }
      return { success: true, resourceType: "Observation", action: "skipped", details: "Unknown observation type" };
    }
    
    const measuredAt = observation.effectiveDateTime || observation.issued || new Date().toISOString();
    
    // Insert health metric
    const { error } = await supabase.from("health_metrics").insert({
      user_id: userId,
      metric_type: metricType,
      value: value,
      unit: unit,
      measured_at: measuredAt,
      notes: observation.note?.[0]?.text || null,
    });
    
    if (error) throw error;
    
    return { success: true, resourceType: "Observation", action: "imported", details: metricType };
  } catch (error: any) {
    return { success: false, resourceType: "Observation", action: "error", error: error.message };
  }
}

// Process AllergyIntolerance resource
async function processAllergyIntolerance(
  supabase: any,
  userId: string,
  allergy: any,
  conflictResolution: string
): Promise<ImportResult> {
  try {
    const allergyText = getCodeableConceptText(allergy.code) || 
                        allergy.reaction?.[0]?.substance?.text || 
                        "Unknown allergy";
    
    // Get existing allergies
    const { data: healthData } = await supabase
      .from("health_data")
      .select("health_allergies")
      .eq("user_id", userId)
      .single();
    
    const existingAllergies = healthData?.health_allergies || "";
    
    // Check for duplicates
    if (existingAllergies.toLowerCase().includes(allergyText.toLowerCase())) {
      return { success: true, resourceType: "AllergyIntolerance", action: "skipped", details: "Already exists" };
    }
    
    // Append new allergy
    const newAllergies = existingAllergies ? `${existingAllergies}, ${allergyText}` : allergyText;
    
    const { error } = await supabase
      .from("health_data")
      .upsert({ user_id: userId, health_allergies: newAllergies }, { onConflict: "user_id" });
    
    if (error) throw error;
    
    return { success: true, resourceType: "AllergyIntolerance", action: "imported", details: allergyText };
  } catch (error: any) {
    return { success: false, resourceType: "AllergyIntolerance", action: "error", error: error.message };
  }
}

// Process Condition resource
async function processCondition(
  supabase: any,
  userId: string,
  condition: any,
  conflictResolution: string
): Promise<ImportResult> {
  try {
    const conditionText = getCodeableConceptText(condition.code);
    if (!conditionText) {
      return { success: true, resourceType: "Condition", action: "skipped", details: "No condition text" };
    }
    
    const isActive = condition.clinicalStatus?.coding?.[0]?.code === "active" ||
                     condition.clinicalStatus?.text?.toLowerCase() === "active";
    
    // Get existing conditions
    const { data: healthData } = await supabase
      .from("health_data")
      .select("chronic_diseases, previous_diseases")
      .eq("user_id", userId)
      .single();
    
    const targetField = isActive ? "chronic_diseases" : "previous_diseases";
    const existingValue = healthData?.[targetField] || "";
    
    // Check for duplicates
    if (existingValue.toLowerCase().includes(conditionText.toLowerCase())) {
      return { success: true, resourceType: "Condition", action: "skipped", details: "Already exists" };
    }
    
    // Append new condition
    const newValue = existingValue ? `${existingValue}, ${conditionText}` : conditionText;
    
    const { error } = await supabase
      .from("health_data")
      .upsert({ user_id: userId, [targetField]: newValue }, { onConflict: "user_id" });
    
    if (error) throw error;
    
    return { success: true, resourceType: "Condition", action: "imported", details: `${conditionText} (${isActive ? "active" : "resolved"})` };
  } catch (error: any) {
    return { success: false, resourceType: "Condition", action: "error", error: error.message };
  }
}

// Process MedicationStatement resource
async function processMedicationStatement(
  supabase: any,
  userId: string,
  medication: any,
  conflictResolution: string
): Promise<ImportResult> {
  try {
    const medicationText = getCodeableConceptText(medication.medicationCodeableConcept) ||
                           medication.medicationReference?.display ||
                           "Unknown medication";
    
    // Get existing medications
    const { data: healthData } = await supabase
      .from("health_data")
      .select("current_medications")
      .eq("user_id", userId)
      .single();
    
    const existingMeds = healthData?.current_medications || "";
    
    // Check for duplicates
    if (existingMeds.toLowerCase().includes(medicationText.toLowerCase())) {
      return { success: true, resourceType: "MedicationStatement", action: "skipped", details: "Already exists" };
    }
    
    // Build medication string with dosage if available
    let medString = medicationText;
    if (medication.dosage?.[0]) {
      const dosage = medication.dosage[0];
      const doseText = dosage.text || dosage.doseAndRate?.[0]?.doseQuantity?.value;
      const frequency = dosage.timing?.repeat?.frequency;
      if (doseText || frequency) {
        medString += ` (${[doseText, frequency ? `${frequency}x daily` : ""].filter(Boolean).join(", ")})`;
      }
    }
    
    // Append new medication
    const newMeds = existingMeds ? `${existingMeds}, ${medString}` : medString;
    
    const { error } = await supabase
      .from("health_data")
      .upsert({ user_id: userId, current_medications: newMeds }, { onConflict: "user_id" });
    
    if (error) throw error;
    
    return { success: true, resourceType: "MedicationStatement", action: "imported", details: medicationText };
  } catch (error: any) {
    return { success: false, resourceType: "MedicationStatement", action: "error", error: error.message };
  }
}

// Process DocumentReference resource
async function processDocumentReference(
  supabase: any,
  userId: string,
  doc: any,
  conflictResolution: string
): Promise<ImportResult> {
  try {
    const title = doc.description || 
                  getCodeableConceptText(doc.type) || 
                  `Document ${doc.id || "Unknown"}`;
    
    const category = getCodeableConceptText(doc.category?.[0]) || "General";
    const recordDate = doc.date || doc.content?.[0]?.attachment?.creation || new Date().toISOString();
    
    // Check for existing document with same title
    const { data: existing } = await supabase
      .from("health_records")
      .select("id")
      .eq("user_id", userId)
      .eq("title", title)
      .maybeSingle();
    
    if (existing && conflictResolution === "skip") {
      return { success: true, resourceType: "DocumentReference", action: "skipped", details: "Already exists" };
    }
    
    // Create health record (metadata only - no actual file)
    const { error } = await supabase.from("health_records").insert({
      user_id: userId,
      title: title,
      category: category.toLowerCase(),
      record_date: recordDate.split("T")[0],
      notes: doc.description || "Imported from FHIR bundle",
      file_url: null, // No file URL for imported metadata
    });
    
    if (error) throw error;
    
    return { success: true, resourceType: "DocumentReference", action: "imported", details: title };
  } catch (error: any) {
    return { success: false, resourceType: "DocumentReference", action: "error", error: error.message };
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { bundle, conflictResolution = "merge", sourceFilename } = await req.json();

    if (!bundle || bundle.resourceType !== "Bundle") {
      return new Response(
        JSON.stringify({ error: "Invalid FHIR bundle" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fhirBundle = bundle as FHIRBundle;
    const entries = fhirBundle.entry || [];

    // Create import log
    const { data: importLog, error: logError } = await supabase
      .from("provider_import_logs")
      .insert({
        provider_type: "patient",
        provider_id: user.id,
        import_type: "fhir_health_data",
        source_format: "fhir_r4",
        source_filename: sourceFilename || "unknown.json",
        total_records: entries.length,
        status: "processing",
        metadata: {
          bundle_type: fhirBundle.type,
          conflict_resolution: conflictResolution,
        },
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to create import log:", logError);
    }

    // Process resources
    const summary: ImportSummary = {
      totalResources: entries.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      results: [],
    };

    for (const entry of entries) {
      const resource = entry.resource;
      if (!resource) continue;

      let result: ImportResult;

      switch (resource.resourceType) {
        case "Patient":
          result = await processPatient(supabase, user.id, resource, conflictResolution);
          break;
        case "Observation":
          result = await processObservation(supabase, user.id, resource, conflictResolution);
          break;
        case "AllergyIntolerance":
          result = await processAllergyIntolerance(supabase, user.id, resource, conflictResolution);
          break;
        case "Condition":
          result = await processCondition(supabase, user.id, resource, conflictResolution);
          break;
        case "MedicationStatement":
          result = await processMedicationStatement(supabase, user.id, resource, conflictResolution);
          break;
        case "MedicationRequest":
          // Treat same as MedicationStatement for import purposes
          result = await processMedicationStatement(supabase, user.id, resource, conflictResolution);
          break;
        case "DocumentReference":
          result = await processDocumentReference(supabase, user.id, resource, conflictResolution);
          break;
        default:
          result = {
            success: true,
            resourceType: resource.resourceType,
            action: "skipped",
            details: "Unsupported resource type",
          };
      }

      summary.results.push(result);

      if (result.action === "imported" || result.action === "updated") {
        summary.imported++;
        
        // Record provenance for imported resources
        try {
          await supabase.from("data_provenance").insert({
            user_id: user.id,
            target_resource_type: resource.resourceType.toLowerCase(),
            target_resource_id: resource.id || crypto.randomUUID(),
            activity_type: result.action === "imported" ? "import" : "update",
            agent_type: "patient",
            agent_id: user.id,
            source_system: "fhir_import",
            source_document: sourceFilename || "unknown.json",
            source_version: "R4",
            metadata: {
              fhir_resource_type: resource.resourceType,
              import_details: result.details,
              bundle_type: fhirBundle.type,
            },
          });
        } catch (provErr) {
          console.error("Failed to record provenance:", provErr);
        }
      } else if (result.action === "error") {
        summary.errors++;
      } else {
        summary.skipped++;
      }

      // Log individual record
      if (importLog) {
        await supabase.from("provider_import_records").insert({
          import_log_id: importLog.id,
          source_data: resource,
          target_table: resource.resourceType.toLowerCase(),
          status: result.success ? (result.action === "skipped" ? "skipped" : "success") : "error",
          error_message: result.error || null,
        });
      }
    }

    // Update import log
    if (importLog) {
      await supabase
        .from("provider_import_logs")
        .update({
          imported_count: summary.imported,
          skipped_count: summary.skipped,
          error_count: summary.errors,
          status: summary.errors > 0 ? "completed" : "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", importLog.id);
    }

    console.log(`FHIR import completed for user ${user.id}: ${summary.imported} imported, ${summary.skipped} skipped, ${summary.errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: summary.totalResources,
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
    console.error("FHIR import error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
