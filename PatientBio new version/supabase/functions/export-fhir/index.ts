import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    lastUpdated?: string;
    profile?: string[];
  };
  [key: string]: unknown;
}

interface FHIRBundle {
  resourceType: "Bundle";
  id: string;
  type: "collection";
  timestamp: string;
  meta: {
    lastUpdated: string;
  };
  entry: Array<{
    fullUrl: string;
    resource: FHIRResource;
  }>;
}

// Generate a FHIR-compliant Patient resource
function createPatientResource(profile: any, healthData: any): FHIRResource {
  const patient: FHIRResource = {
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
    telecom: [],
    address: [],
  };

  // Add phone if available
  if (profile.phone) {
    (patient.telecom as any[]).push({
      system: "phone",
      value: profile.phone,
      use: "mobile",
    });
  }

  // Add email if available
  if (profile.email) {
    (patient.telecom as any[]).push({
      system: "email",
      value: profile.email,
    });
  }

  // Add address if available
  if (profile.address || profile.city || profile.country) {
    (patient.address as any[]).push({
      use: "home",
      text: [profile.address, profile.city, profile.country].filter(Boolean).join(", "),
      city: profile.city || undefined,
      country: profile.country || undefined,
    });
  }

  // Add emergency contact as contact
  if (healthData?.emergency_contact_name) {
    patient.contact = [
      {
        relationship: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v2-0131",
                code: "C",
                display: "Emergency Contact",
              },
            ],
          },
        ],
        name: {
          text: healthData.emergency_contact_name,
        },
        telecom: healthData.emergency_contact_phone
          ? [
              {
                system: "phone",
                value: healthData.emergency_contact_phone,
              },
            ]
          : [],
      },
    ];
  }

  return patient;
}

// Create Observation resource for blood group
function createBloodGroupObservation(userId: string, bloodGroup: string): FHIRResource {
  const aboMap: Record<string, { code: string; display: string }> = {
    "A+": { code: "278147001", display: "Blood group A Rh(D) positive" },
    "A-": { code: "278148006", display: "Blood group A Rh(D) negative" },
    "B+": { code: "278149003", display: "Blood group B Rh(D) positive" },
    "B-": { code: "278150003", display: "Blood group B Rh(D) negative" },
    "AB+": { code: "278151004", display: "Blood group AB Rh(D) positive" },
    "AB-": { code: "278152006", display: "Blood group AB Rh(D) negative" },
    "O+": { code: "278153001", display: "Blood group O Rh(D) positive" },
    "O-": { code: "278154007", display: "Blood group O Rh(D) negative" },
  };

  const mapping = aboMap[bloodGroup] || { code: "unknown", display: bloodGroup };

  return {
    resourceType: "Observation",
    id: `blood-group-${userId}`,
    meta: {
      profile: ["http://hl7.org/fhir/StructureDefinition/Observation"],
    },
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "laboratory",
            display: "Laboratory",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "882-1",
          display: "ABO and Rh group [Type] in Blood",
        },
      ],
      text: "Blood Type",
    },
    subject: {
      reference: `Patient/${userId}`,
    },
    valueCodeableConcept: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: mapping.code,
          display: mapping.display,
        },
      ],
      text: bloodGroup,
    },
  };
}

// Create Observation resources for health metrics (vitals)
function createHealthMetricObservations(userId: string, metrics: any[]): FHIRResource[] {
  const loincCodes: Record<string, { code: string; display: string; unit: string }> = {
    weight: { code: "29463-7", display: "Body weight", unit: "kg" },
    height: { code: "8302-2", display: "Body height", unit: "cm" },
    blood_pressure_systolic: { code: "8480-6", display: "Systolic blood pressure", unit: "mmHg" },
    blood_pressure_diastolic: { code: "8462-4", display: "Diastolic blood pressure", unit: "mmHg" },
    heart_rate: { code: "8867-4", display: "Heart rate", unit: "beats/min" },
    temperature: { code: "8310-5", display: "Body temperature", unit: "Cel" },
    blood_glucose: { code: "2339-0", display: "Glucose [Mass/volume] in Blood", unit: "mg/dL" },
    oxygen_saturation: { code: "2708-6", display: "Oxygen saturation in Arterial blood", unit: "%" },
    bmi: { code: "39156-5", display: "Body mass index (BMI)", unit: "kg/m2" },
    respiratory_rate: { code: "9279-1", display: "Respiratory rate", unit: "breaths/min" },
  };

  return metrics
    .filter((m) => loincCodes[m.metric_type])
    .map((metric) => {
      const coding = loincCodes[metric.metric_type];
      return {
        resourceType: "Observation",
        id: `metric-${metric.id}`,
        meta: {
          profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-vital-signs"],
          lastUpdated: metric.measured_at || metric.created_at,
        },
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "vital-signs",
                display: "Vital Signs",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: coding.code,
              display: coding.display,
            },
          ],
          text: coding.display,
        },
        subject: {
          reference: `Patient/${userId}`,
        },
        effectiveDateTime: metric.measured_at || metric.created_at,
        valueQuantity: {
          value: metric.value,
          unit: metric.unit || coding.unit,
          system: "http://unitsofmeasure.org",
          code: coding.unit,
        },
      };
    });
}

// Create AllergyIntolerance resources
function createAllergyResources(userId: string, allergies: string): FHIRResource[] {
  if (!allergies) return [];

  const allergyList = allergies
    .split(/[,;\n]/)
    .map((a) => a.trim())
    .filter(Boolean);

  return allergyList.map((allergy, index) => ({
    resourceType: "AllergyIntolerance",
    id: `allergy-${userId}-${index}`,
    meta: {
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance"],
    },
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
          code: "active",
          display: "Active",
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
          code: "unconfirmed",
          display: "Unconfirmed",
        },
      ],
    },
    category: ["medication"],
    patient: {
      reference: `Patient/${userId}`,
    },
    code: {
      text: allergy,
    },
  }));
}

// Create Condition resources for chronic diseases
function createConditionResources(userId: string, conditions: string, category: string): FHIRResource[] {
  if (!conditions) return [];

  const conditionList = conditions
    .split(/[,;\n]/)
    .map((c) => c.trim())
    .filter(Boolean);

  return conditionList.map((condition, index) => ({
    resourceType: "Condition",
    id: `condition-${category}-${userId}-${index}`,
    meta: {
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"],
    },
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: category === "chronic" ? "active" : "resolved",
          display: category === "chronic" ? "Active" : "Resolved",
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
          code: "confirmed",
          display: "Confirmed",
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-category",
            code: "problem-list-item",
            display: "Problem List Item",
          },
        ],
      },
    ],
    subject: {
      reference: `Patient/${userId}`,
    },
    code: {
      text: condition,
    },
  }));
}

// Create MedicationStatement resources
function createMedicationResources(userId: string, medications: string): FHIRResource[] {
  if (!medications) return [];

  const medList = medications
    .split(/[,;\n]/)
    .map((m) => m.trim())
    .filter(Boolean);

  return medList.map((medication, index) => ({
    resourceType: "MedicationStatement",
    id: `medication-${userId}-${index}`,
    meta: {
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationstatement"],
    },
    status: "active",
    medicationCodeableConcept: {
      text: medication,
    },
    subject: {
      reference: `Patient/${userId}`,
    },
    effectiveDateTime: new Date().toISOString(),
  }));
}

// Create DocumentReference for health records with ICD-11 coding
function createDocumentReferences(userId: string, records: any[]): FHIRResource[] {
  return records.map((record) => {
    const codings: any[] = [];

    // Add ICD-11 coding if available
    if (record.icd11_code) {
      codings.push({
        system: "http://id.who.int/icd/release/11",
        code: record.icd11_code,
        display: record.disease_category?.replace(/_/g, " ") || record.icd11_code,
      });
    }

    // Add ICD-11 chapter coding if available
    if (record.icd11_chapter_code && !record.icd11_code) {
      codings.push({
        system: "http://id.who.int/icd/release/11",
        code: record.icd11_chapter_code,
        display: record.disease_category?.replace(/_/g, " ") || record.icd11_chapter_code,
      });
    }

    return {
      resourceType: "DocumentReference",
      id: record.id,
      meta: {
        lastUpdated: record.uploaded_at,
      },
      status: "current",
      type: {
        coding: [
          {
            system: "http://loinc.org",
            code: "34133-9",
            display: "Summarization of Episode Note",
          },
        ],
        text: record.category || "Health Record",
      },
      category: [
        {
          coding: codings.length > 0 ? codings : [
            {
              system: "http://loinc.org",
              code: "34133-9",
              display: "Summary of episode note",
            },
          ],
          text: record.disease_category || "General",
        },
      ],
      subject: {
        reference: `Patient/${userId}`,
      },
      date: record.record_date || record.uploaded_at,
      description: record.title,
      content: [
        {
          attachment: {
            contentType: record.file_type || "application/pdf",
            title: record.title,
          },
        },
      ],
    };
  });
}

// Create Prescription/MedicationRequest resources from prescriptions
function createPrescriptionResources(userId: string, prescriptions: any[]): FHIRResource[] {
  const resources: FHIRResource[] = [];

  prescriptions.forEach((rx) => {
    // Create MedicationRequest for each prescription
    const icdCodings: any[] = [];
    if (rx.icd11_code) {
      icdCodings.push({
        system: "http://id.who.int/icd/release/11",
        code: rx.icd11_code,
        display: rx.diagnosis || rx.icd11_code,
      });
    }

    const medicationRequest: FHIRResource = {
      resourceType: "MedicationRequest",
      id: rx.id,
      meta: {
        lastUpdated: rx.updated_at || rx.created_at,
      },
      status: "active",
      intent: "order",
      medicationCodeableConcept: {
        text: rx.medication_name || "Prescription",
      },
      subject: {
        reference: `Patient/${userId}`,
      },
      authoredOn: rx.created_at,
      dosageInstruction: rx.dosage
        ? [{ text: `${rx.dosage}${rx.frequency ? `, ${rx.frequency}` : ""}` }]
        : undefined,
      reasonCode: icdCodings.length > 0
        ? [{ coding: icdCodings, text: rx.diagnosis }]
        : rx.diagnosis ? [{ text: rx.diagnosis }] : undefined,
      note: rx.diagnosis ? [{ text: `Diagnosis: ${rx.diagnosis}` }] : undefined,
    };

    resources.push(medicationRequest);
  });

  return resources;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating FHIR export for user: ${user.id}`);

    // Fetch all patient data in parallel (including health metrics)
    const [profileResult, healthDataResult, recordsResult, prescriptionsResult, metricsResult] = await Promise.all([
      supabase.from("user_profiles").select("user_id, display_name, date_of_birth, gender, phone, location, patient_passport_id").eq("user_id", user.id).single(),
      supabase.from("health_data").select("blood_group, height, weight, chronic_diseases, previous_diseases, health_allergies, current_medications, emergency_contact_name, emergency_contact_phone").eq("user_id", user.id).single(),
      supabase.from("health_records").select("id, title, category, disease_category, icd11_chapter_code, icd11_code, icd_standard, file_type, record_date, uploaded_at").eq("user_id", user.id),
      supabase.from("prescriptions").select("id, medication_name, dosage, frequency, diagnosis, icd11_code, icd11_chapter_code, icd_standard, created_at, updated_at").eq("patient_id", user.id),
      supabase.from("health_metrics").select("id, metric_type, value, unit, measured_at, created_at").eq("user_id", user.id).order("measured_at", { ascending: false }).limit(100),
    ]);

    const profile = profileResult.data || { user_id: user.id, display_name: user.email };
    const healthData = healthDataResult.data;
    const records = recordsResult.data || [];
    const prescriptions = prescriptionsResult.data || [];
    const metrics = metricsResult.data || [];

    console.log(`Found: Profile=${!!profile}, HealthData=${!!healthData}, Records=${records.length}, Prescriptions=${prescriptions.length}, Metrics=${metrics.length}`);

    // Build FHIR Bundle
    const bundleId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const entries: Array<{ fullUrl: string; resource: FHIRResource }> = [];

    // Add Patient resource
    const patientResource = createPatientResource(profile, healthData);
    entries.push({
      fullUrl: `urn:uuid:${user.id}`,
      resource: patientResource,
    });

    // Add health data resources if available
    if (healthData) {
      // Blood group observation
      if (healthData.blood_group) {
        const bloodGroupObs = createBloodGroupObservation(user.id, healthData.blood_group);
        entries.push({
          fullUrl: `urn:uuid:${bloodGroupObs.id}`,
          resource: bloodGroupObs,
        });
      }

      // Allergies
      const allergyResources = createAllergyResources(user.id, healthData.health_allergies);
      allergyResources.forEach((allergy) => {
        entries.push({
          fullUrl: `urn:uuid:${allergy.id}`,
          resource: allergy,
        });
      });

      // Chronic diseases
      const chronicConditions = createConditionResources(user.id, healthData.chronic_diseases, "chronic");
      chronicConditions.forEach((condition) => {
        entries.push({
          fullUrl: `urn:uuid:${condition.id}`,
          resource: condition,
        });
      });

      // Previous diseases
      const previousConditions = createConditionResources(user.id, healthData.previous_diseases, "resolved");
      previousConditions.forEach((condition) => {
        entries.push({
          fullUrl: `urn:uuid:${condition.id}`,
          resource: condition,
        });
      });

      // Current medications
      const medicationResources = createMedicationResources(user.id, healthData.current_medications);
      medicationResources.forEach((med) => {
        entries.push({
          fullUrl: `urn:uuid:${med.id}`,
          resource: med,
        });
      });
    }

    // Add health metrics as vital sign Observations
    const metricObservations = createHealthMetricObservations(user.id, metrics);
    metricObservations.forEach((obs) => {
      entries.push({
        fullUrl: `urn:uuid:${obs.id}`,
        resource: obs,
      });
    });

    // Add document references for health records
    const documentRefs = createDocumentReferences(user.id, records);
    documentRefs.forEach((doc) => {
      entries.push({
        fullUrl: `urn:uuid:${doc.id}`,
        resource: doc,
      });
    });

    // Add prescription resources
    const prescriptionResources = createPrescriptionResources(user.id, prescriptions);
    prescriptionResources.forEach((rx) => {
      entries.push({
        fullUrl: `urn:uuid:${rx.id}`,
        resource: rx,
      });
    });

    // Create the final bundle
    const bundle: FHIRBundle = {
      resourceType: "Bundle",
      id: bundleId,
      type: "collection",
      timestamp,
      meta: {
        lastUpdated: timestamp,
      },
      entry: entries,
    };

    console.log(`FHIR Bundle created with ${entries.length} entries`);

    // Log export to audit trail
    await supabase.rpc("add_audit_entry", {
      p_event_type: "FHIR_EXPORT",
      p_entity_type: "fhir_bundle",
      p_entity_id: null,
      p_user_id: user.id,
      p_action: "exported",
      p_details: {
        resource_count: entries.length,
        resource_types: Object.keys(
          entries.reduce((acc, e) => {
            acc[e.resource.resourceType] = true;
            return acc;
          }, {} as Record<string, boolean>)
        ),
      },
    });

    return new Response(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/fhir+json",
        "Content-Disposition": `attachment; filename="patient-bio-fhir-${new Date().toISOString().split("T")[0]}.json"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("FHIR export error:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
