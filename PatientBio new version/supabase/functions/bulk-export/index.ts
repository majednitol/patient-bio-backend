import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BulkExportRequest {
  action: "start" | "status" | "download";
  jobId?: string;
  resourceTypes?: string[];
  includeOptions?: {
    includeRecords?: boolean;
    includePrescriptions?: boolean;
    includeMetrics?: boolean;
  };
}

// Generate NDJSON line for a FHIR resource
function toNDJSONLine(resource: any): string {
  return JSON.stringify(resource);
}

// Create Patient resource
function createPatientResource(profile: any, healthData: any): any {
  return {
    resourceType: "Patient",
    id: profile.user_id,
    meta: {
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
    },
    identifier: [
      {
        system: "https://patientbio.health/patient-passport-id",
        value: profile.patient_passport_id || profile.user_id,
      },
    ],
    active: true,
    name: [
      {
        use: "official",
        text: profile.display_name || "Unknown",
        family: profile.display_name?.split(" ").slice(-1)[0] || "",
        given: profile.display_name?.split(" ").slice(0, -1) || [],
      },
    ],
    gender: profile.gender?.toLowerCase() || "unknown",
    birthDate: profile.date_of_birth || undefined,
    telecom: [
      ...(profile.phone ? [{ system: "phone", value: profile.phone, use: "mobile" }] : []),
      ...(profile.email ? [{ system: "email", value: profile.email }] : []),
    ],
    address: profile.city || profile.country ? [
      {
        use: "home",
        city: profile.city || undefined,
        country: profile.country || undefined,
      },
    ] : [],
  };
}

// Create AllergyIntolerance resources
function createAllergyResources(userId: string, allergies: string | null): any[] {
  if (!allergies) return [];
  return allergies
    .split(/[,;\n]/)
    .map((a) => a.trim())
    .filter(Boolean)
    .map((allergy, index) => ({
      resourceType: "AllergyIntolerance",
      id: `allergy-${userId}-${index}`,
      clinicalStatus: {
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: "active" }],
      },
      patient: { reference: `Patient/${userId}` },
      code: { text: allergy },
    }));
}

// Create Condition resources
function createConditionResources(userId: string, conditions: string | null, status: "active" | "resolved"): any[] {
  if (!conditions) return [];
  return conditions
    .split(/[,;\n]/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((condition, index) => ({
      resourceType: "Condition",
      id: `condition-${status}-${userId}-${index}`,
      clinicalStatus: {
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: status }],
      },
      subject: { reference: `Patient/${userId}` },
      code: { text: condition },
    }));
}

// Create MedicationStatement resources
function createMedicationResources(userId: string, medications: string | null): any[] {
  if (!medications) return [];
  return medications
    .split(/[,;\n]/)
    .map((m) => m.trim())
    .filter(Boolean)
    .map((medication, index) => ({
      resourceType: "MedicationStatement",
      id: `medication-${userId}-${index}`,
      status: "active",
      medicationCodeableConcept: { text: medication },
      subject: { reference: `Patient/${userId}` },
    }));
}

// Create Observation resources for metrics
function createObservationResources(userId: string, metrics: any[]): any[] {
  const loincCodes: Record<string, { code: string; display: string; unit: string }> = {
    weight: { code: "29463-7", display: "Body weight", unit: "kg" },
    height: { code: "8302-2", display: "Body height", unit: "cm" },
    blood_pressure_systolic: { code: "8480-6", display: "Systolic blood pressure", unit: "mmHg" },
    blood_pressure_diastolic: { code: "8462-4", display: "Diastolic blood pressure", unit: "mmHg" },
    heart_rate: { code: "8867-4", display: "Heart rate", unit: "beats/min" },
    temperature: { code: "8310-5", display: "Body temperature", unit: "Cel" },
    blood_glucose: { code: "2339-0", display: "Glucose", unit: "mg/dL" },
    oxygen_saturation: { code: "2708-6", display: "Oxygen saturation", unit: "%" },
  };

  return metrics
    .filter((m) => loincCodes[m.metric_type])
    .map((metric) => {
      const coding = loincCodes[metric.metric_type];
      return {
        resourceType: "Observation",
        id: `metric-${metric.id}`,
        status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: coding.code, display: coding.display }] },
        subject: { reference: `Patient/${userId}` },
        effectiveDateTime: metric.measured_at || metric.created_at,
        valueQuantity: { value: metric.value, unit: metric.unit || coding.unit, system: "http://unitsofmeasure.org" },
      };
    });
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: BulkExportRequest = await req.json();
    const { action, jobId, resourceTypes, includeOptions } = body;

    console.log(`Bulk export action: ${action} for user: ${user.id}`);

    // Handle status check
    if (action === "status" && jobId) {
      const { data: job, error } = await supabase
        .from("bulk_export_jobs")
        .select("id, user_id, status, export_type, resource_types, include_options, total_resources, processed_resources, file_size_bytes, output_url, started_at, completed_at, expires_at, error_message, created_at, updated_at")
        .eq("id", jobId)
        .eq("user_id", user.id)
        .single();

      if (error || !job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(job), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=10" },
      });
    }

    // Handle start export
    if (action === "start") {
      // Create job record
      const { data: job, error: createError } = await supabase
        .from("bulk_export_jobs")
        .insert({
          user_id: user.id,
          status: "processing",
          export_type: "ndjson",
          resource_types: resourceTypes || ["Patient", "Observation", "Condition", "MedicationStatement", "AllergyIntolerance"],
          include_options: includeOptions || {},
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        })
        .select()
        .single();

      if (createError || !job) {
        console.error("Failed to create job:", createError);
        return new Response(JSON.stringify({ error: "Failed to create export job" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Created bulk export job: ${job.id}`);

      // Fetch patient data
      const [profileResult, healthDataResult, metricsResult] = await Promise.all([
        supabase.from("user_profiles").select("user_id, display_name, date_of_birth, gender, phone, city, country, patient_passport_id").eq("user_id", user.id).single(),
        supabase.from("health_data").select("user_id, blood_group, health_allergies, current_medications, chronic_diseases, previous_diseases").eq("user_id", user.id).single(),
        includeOptions?.includeMetrics !== false
          ? supabase.from("health_metrics").select("id, user_id, metric_type, value, unit, measured_at, created_at").eq("user_id", user.id).order("measured_at", { ascending: false }).limit(500)
          : Promise.resolve({ data: [] }),
      ]);

      const profile = profileResult.data || { user_id: user.id, display_name: user.email };
      const healthData = healthDataResult.data || {};
      const metrics = metricsResult.data || [];

      // Build NDJSON output
      const resources: any[] = [];

      // Patient resource
      resources.push(createPatientResource(profile, healthData));

      // Allergies
      if (healthData.health_allergies) {
        resources.push(...createAllergyResources(user.id, healthData.health_allergies));
      }

      // Conditions
      if (healthData.chronic_diseases) {
        resources.push(...createConditionResources(user.id, healthData.chronic_diseases, "active"));
      }
      if (healthData.previous_diseases) {
        resources.push(...createConditionResources(user.id, healthData.previous_diseases, "resolved"));
      }

      // Medications
      if (healthData.current_medications) {
        resources.push(...createMedicationResources(user.id, healthData.current_medications));
      }

      // Observations (metrics)
      if (metrics.length > 0) {
        resources.push(...createObservationResources(user.id, metrics));
      }

      // Generate NDJSON
      const ndjsonContent = resources.map(toNDJSONLine).join("\n");
      const contentBytes = new TextEncoder().encode(ndjsonContent);

      // Update job with completion
      await supabase
        .from("bulk_export_jobs")
        .update({
          status: "completed",
          total_resources: resources.length,
          processed_resources: resources.length,
          file_size_bytes: contentBytes.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      console.log(`Bulk export completed: ${resources.length} resources, ${contentBytes.length} bytes`);

      // Return the NDJSON content directly for download
      return new Response(ndjsonContent, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/ndjson",
          "Content-Disposition": `attachment; filename="fhir-bulk-export-${new Date().toISOString().split("T")[0]}.ndjson"`,
          "X-Job-Id": job.id,
          "X-Resource-Count": String(resources.length),
        },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bulk export error:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
