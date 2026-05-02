/**
 * FHIR Resource Mapper Utility
 * Maps FHIR R4 resources to internal data structures for preview
 */

export interface MappedResource {
  id: string;
  resourceType: string;
  displayName: string;
  category: string;
  details: string[];
  raw: unknown;
}

export interface FHIRBundle {
  resourceType: "Bundle";
  type: string;
  entry?: Array<{ resource: FHIRResource }>;
}

export interface FHIRResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

export interface ImportPreview {
  patient: MappedResource | null;
  observations: MappedResource[];
  allergies: MappedResource[];
  conditions: MappedResource[];
  medications: MappedResource[];
  documents: MappedResource[];
  unsupported: MappedResource[];
  totalCount: number;
}

// Extract text from CodeableConcept
function getCodeableConceptText(concept: unknown): string {
  if (!concept) return "";
  if (typeof concept === "string") return concept;
  
  const cc = concept as Record<string, unknown>;
  if (cc.text) return cc.text as string;
  
  const coding = cc.coding as Array<Record<string, unknown>> | undefined;
  if (coding?.[0]?.display) return coding[0].display as string;
  if (coding?.[0]?.code) return coding[0].code as string;
  
  return "";
}

// Map Patient resource
function mapPatient(resource: FHIRResource): MappedResource {
  const name = (resource.name as Array<Record<string, unknown>>)?.[0];
  let displayName = "Unknown Patient";
  
  if (name) {
    const given = (name.given as string[])?.join(" ") || "";
    const family = name.family as string || "";
    displayName = [given, family].filter(Boolean).join(" ") || "Unknown Patient";
  }
  
  const details: string[] = [];
  
  if (resource.birthDate) {
    details.push(`DOB: ${resource.birthDate}`);
  }
  
  if (resource.gender) {
    details.push(`Gender: ${resource.gender}`);
  }
  
  const telecom = resource.telecom as Array<Record<string, unknown>> | undefined;
  const phone = telecom?.find((t) => t.system === "phone");
  if (phone?.value) {
    details.push(`Phone: ${phone.value}`);
  }
  
  return {
    id: resource.id || `patient-${Date.now()}`,
    resourceType: "Patient",
    displayName,
    category: "Demographics",
    details,
    raw: resource,
  };
}

// Map Observation resource
function mapObservation(resource: FHIRResource): MappedResource {
  const code = resource.code as Record<string, unknown>;
  const displayName = getCodeableConceptText(code) || "Unknown Observation";
  
  const details: string[] = [];
  
  // Extract value
  if (resource.valueQuantity) {
    const vq = resource.valueQuantity as Record<string, unknown>;
    details.push(`Value: ${vq.value} ${vq.unit || ""}`);
  } else if (resource.valueString) {
    details.push(`Value: ${resource.valueString}`);
  } else if (resource.valueCodeableConcept) {
    details.push(`Value: ${getCodeableConceptText(resource.valueCodeableConcept)}`);
  }
  
  // Date
  if (resource.effectiveDateTime) {
    details.push(`Date: ${new Date(resource.effectiveDateTime as string).toLocaleDateString()}`);
  }
  
  // Category
  let category = "Vital Signs";
  const resourceCategory = resource.category as Array<Record<string, unknown>> | undefined;
  if (resourceCategory?.[0]) {
    const catText = getCodeableConceptText(resourceCategory[0]);
    if (catText) category = catText;
  }
  
  return {
    id: resource.id || `obs-${Date.now()}-${Math.random()}`,
    resourceType: "Observation",
    displayName,
    category,
    details,
    raw: resource,
  };
}

// Map AllergyIntolerance resource
function mapAllergy(resource: FHIRResource): MappedResource {
  const code = resource.code as Record<string, unknown>;
  const displayName = getCodeableConceptText(code) || "Unknown Allergy";
  
  const details: string[] = [];
  
  // Severity
  const criticality = resource.criticality as string;
  if (criticality) {
    details.push(`Severity: ${criticality}`);
  }
  
  // Reactions
  const reactions = resource.reaction as Array<Record<string, unknown>> | undefined;
  if (reactions?.[0]) {
    const manifestation = reactions[0].manifestation as Array<Record<string, unknown>> | undefined;
    if (manifestation?.[0]) {
      details.push(`Reaction: ${getCodeableConceptText(manifestation[0])}`);
    }
  }
  
  // Status
  const clinicalStatus = resource.clinicalStatus as Record<string, unknown>;
  if (clinicalStatus) {
    details.push(`Status: ${getCodeableConceptText(clinicalStatus)}`);
  }
  
  return {
    id: resource.id || `allergy-${Date.now()}-${Math.random()}`,
    resourceType: "AllergyIntolerance",
    displayName,
    category: "Allergies",
    details,
    raw: resource,
  };
}

// Map Condition resource
function mapCondition(resource: FHIRResource): MappedResource {
  const code = resource.code as Record<string, unknown>;
  const displayName = getCodeableConceptText(code) || "Unknown Condition";
  
  const details: string[] = [];
  
  // Clinical status
  const clinicalStatus = resource.clinicalStatus as Record<string, unknown>;
  const statusText = getCodeableConceptText(clinicalStatus);
  if (statusText) {
    details.push(`Status: ${statusText}`);
  }
  
  // Onset
  if (resource.onsetDateTime) {
    details.push(`Onset: ${new Date(resource.onsetDateTime as string).toLocaleDateString()}`);
  }
  
  // Category
  const category = resource.category as Array<Record<string, unknown>> | undefined;
  let categoryText = "Condition";
  if (category?.[0]) {
    categoryText = getCodeableConceptText(category[0]) || "Condition";
  }
  
  return {
    id: resource.id || `condition-${Date.now()}-${Math.random()}`,
    resourceType: "Condition",
    displayName,
    category: statusText === "active" ? "Active Conditions" : "Past Conditions",
    details,
    raw: resource,
  };
}

// Map MedicationStatement/MedicationRequest resource
function mapMedication(resource: FHIRResource): MappedResource {
  let displayName = "Unknown Medication";
  
  if (resource.medicationCodeableConcept) {
    displayName = getCodeableConceptText(resource.medicationCodeableConcept);
  } else if (resource.medicationReference) {
    const ref = resource.medicationReference as Record<string, unknown>;
    displayName = (ref.display as string) || "Unknown Medication";
  }
  
  const details: string[] = [];
  
  // Dosage
  const dosage = resource.dosage as Array<Record<string, unknown>> | undefined;
  if (dosage?.[0]) {
    if (dosage[0].text) {
      details.push(`Dosage: ${dosage[0].text}`);
    } else {
      const doseAndRate = dosage[0].doseAndRate as Array<Record<string, unknown>> | undefined;
      if (doseAndRate?.[0]?.doseQuantity) {
        const dq = doseAndRate[0].doseQuantity as Record<string, unknown>;
        details.push(`Dose: ${dq.value} ${dq.unit || ""}`);
      }
    }
  }
  
  // Status
  if (resource.status) {
    details.push(`Status: ${resource.status}`);
  }
  
  return {
    id: resource.id || `med-${Date.now()}-${Math.random()}`,
    resourceType: resource.resourceType,
    displayName,
    category: "Medications",
    details,
    raw: resource,
  };
}

// Map DocumentReference resource
function mapDocument(resource: FHIRResource): MappedResource {
  let displayName = (resource.description as string) || 
                    getCodeableConceptText(resource.type as Record<string, unknown>) || 
                    "Unknown Document";
  
  const details: string[] = [];
  
  // Date
  if (resource.date) {
    details.push(`Date: ${new Date(resource.date as string).toLocaleDateString()}`);
  }
  
  // Category
  const category = resource.category as Array<Record<string, unknown>> | undefined;
  let categoryText = "Document";
  if (category?.[0]) {
    categoryText = getCodeableConceptText(category[0]) || "Document";
  }
  
  // Content info
  const content = resource.content as Array<Record<string, unknown>> | undefined;
  if (content?.[0]?.attachment) {
    const attachment = content[0].attachment as Record<string, unknown>;
    if (attachment.contentType) {
      details.push(`Type: ${attachment.contentType}`);
    }
  }
  
  return {
    id: resource.id || `doc-${Date.now()}-${Math.random()}`,
    resourceType: "DocumentReference",
    displayName,
    category: categoryText,
    details,
    raw: resource,
  };
}

/**
 * Parse a FHIR Bundle and return a structured preview of all resources
 */
export function parseFHIRBundle(bundle: FHIRBundle): ImportPreview {
  const preview: ImportPreview = {
    patient: null,
    observations: [],
    allergies: [],
    conditions: [],
    medications: [],
    documents: [],
    unsupported: [],
    totalCount: 0,
  };
  
  if (!bundle.entry) {
    return preview;
  }
  
  for (const entry of bundle.entry) {
    const resource = entry.resource;
    if (!resource) continue;
    
    preview.totalCount++;
    
    switch (resource.resourceType) {
      case "Patient":
        preview.patient = mapPatient(resource);
        break;
      case "Observation":
        preview.observations.push(mapObservation(resource));
        break;
      case "AllergyIntolerance":
        preview.allergies.push(mapAllergy(resource));
        break;
      case "Condition":
        preview.conditions.push(mapCondition(resource));
        break;
      case "MedicationStatement":
      case "MedicationRequest":
        preview.medications.push(mapMedication(resource));
        break;
      case "DocumentReference":
        preview.documents.push(mapDocument(resource));
        break;
      default:
        preview.unsupported.push({
          id: resource.id || `unsupported-${Date.now()}-${Math.random()}`,
          resourceType: resource.resourceType,
          displayName: resource.resourceType,
          category: "Unsupported",
          details: ["This resource type will be skipped during import"],
          raw: resource,
        });
    }
  }
  
  return preview;
}

/**
 * Get summary counts for the import preview
 */
export function getPreviewSummary(preview: ImportPreview): Record<string, number> {
  return {
    Patient: preview.patient ? 1 : 0,
    Observations: preview.observations.length,
    Allergies: preview.allergies.length,
    Conditions: preview.conditions.length,
    Medications: preview.medications.length,
    Documents: preview.documents.length,
    Unsupported: preview.unsupported.length,
    Total: preview.totalCount,
  };
}
