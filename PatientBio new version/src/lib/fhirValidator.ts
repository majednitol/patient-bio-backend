/**
 * FHIR R4 Bundle Validator
 * Validates FHIR resources against R4 specification requirements
 */

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  resourceType: string;
  resourceId?: string;
  path: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  resourceCounts: Record<string, number>;
  totalResources: number;
}

// Required fields per FHIR resource type
const REQUIRED_FIELDS: Record<string, string[]> = {
  Patient: ["resourceType"],
  Observation: ["resourceType", "status", "code"],
  AllergyIntolerance: ["resourceType", "patient"],
  Condition: ["resourceType", "subject"],
  MedicationStatement: ["resourceType", "status", "subject", "medicationCodeableConcept"],
  MedicationRequest: ["resourceType", "status", "intent", "subject"],
  DocumentReference: ["resourceType", "status", "content"],
};

// Valid values for status fields
const VALID_STATUSES: Record<string, string[]> = {
  "Observation.status": ["registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error", "unknown"],
  "MedicationStatement.status": ["active", "completed", "entered-in-error", "intended", "stopped", "on-hold", "unknown", "not-taken"],
  "MedicationRequest.status": ["active", "on-hold", "cancelled", "completed", "entered-in-error", "stopped", "draft", "unknown"],
  "DocumentReference.status": ["current", "superseded", "entered-in-error"],
};

// LOINC code pattern
const LOINC_PATTERN = /^\d{1,5}-\d$/;

// SNOMED CT code pattern (numeric only)
const SNOMED_PATTERN = /^\d+$/;

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

function validateRequiredFields(resource: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const resourceType = resource.resourceType;
  
  if (!resourceType) {
    issues.push({
      severity: "error",
      resourceType: "Unknown",
      path: "resourceType",
      message: "Resource must have a resourceType",
      code: "MISSING_RESOURCE_TYPE",
    });
    return issues;
  }

  const requiredFields = REQUIRED_FIELDS[resourceType] || [];
  
  for (const field of requiredFields) {
    if (!getNestedValue(resource, field)) {
      issues.push({
        severity: "error",
        resourceType,
        resourceId: resource.id,
        path: field,
        message: `Required field '${field}' is missing`,
        code: "MISSING_REQUIRED_FIELD",
      });
    }
  }

  return issues;
}

function validateStatusField(resource: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const resourceType = resource.resourceType;
  
  if (resource.status) {
    const statusKey = `${resourceType}.status`;
    const validValues = VALID_STATUSES[statusKey];
    
    if (validValues && !validValues.includes(resource.status)) {
      issues.push({
        severity: "error",
        resourceType,
        resourceId: resource.id,
        path: "status",
        message: `Invalid status value '${resource.status}'. Expected one of: ${validValues.join(", ")}`,
        code: "INVALID_STATUS",
      });
    }
  }

  return issues;
}

function validateCoding(resource: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const resourceType = resource.resourceType;
  
  // Recursively find all coding arrays
  const findCodings = (obj: any, path: string): void => {
    if (!obj || typeof obj !== "object") return;
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => findCodings(item, `${path}[${index}]`));
      return;
    }

    if (obj.coding && Array.isArray(obj.coding)) {
      for (const coding of obj.coding) {
        // Check LOINC codes
        if (coding.system === "http://loinc.org" && coding.code) {
          if (!LOINC_PATTERN.test(coding.code)) {
            issues.push({
              severity: "warning",
              resourceType,
              resourceId: resource.id,
              path: `${path}.coding`,
              message: `LOINC code '${coding.code}' does not match expected format (XXXXX-X)`,
              code: "INVALID_LOINC_FORMAT",
            });
          }
        }
        
        // Check SNOMED codes
        if (coding.system === "http://snomed.info/sct" && coding.code) {
          if (!SNOMED_PATTERN.test(coding.code) && coding.code !== "unknown") {
            issues.push({
              severity: "warning",
              resourceType,
              resourceId: resource.id,
              path: `${path}.coding`,
              message: `SNOMED CT code '${coding.code}' should be numeric`,
              code: "INVALID_SNOMED_FORMAT",
            });
          }
        }
        
        // Ensure code has at least text or display
        if (!coding.code && !coding.display && !obj.text) {
          issues.push({
            severity: "warning",
            resourceType,
            resourceId: resource.id,
            path: `${path}.coding`,
            message: "Coding should have at least a code, display, or text",
            code: "EMPTY_CODING",
          });
        }
      }
    }

    // Recurse into object properties
    for (const key of Object.keys(obj)) {
      if (key !== "coding") {
        findCodings(obj[key], `${path}.${key}`);
      }
    }
  };

  findCodings(resource, resourceType);
  return issues;
}

function validatePatientReference(resource: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const resourceType = resource.resourceType;
  
  // Skip Patient resource itself
  if (resourceType === "Patient") return issues;
  
  // Check for patient/subject reference
  const patientRef = resource.patient || resource.subject;
  
  if (patientRef) {
    if (!patientRef.reference) {
      issues.push({
        severity: "warning",
        resourceType,
        resourceId: resource.id,
        path: resource.patient ? "patient" : "subject",
        message: "Patient reference should include a 'reference' field",
        code: "MISSING_REFERENCE",
      });
    }
  }

  return issues;
}

function validateBundle(bundle: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (!bundle.resourceType || bundle.resourceType !== "Bundle") {
    issues.push({
      severity: "error",
      resourceType: "Bundle",
      path: "resourceType",
      message: "Root resource must be a Bundle",
      code: "INVALID_BUNDLE",
    });
    return issues;
  }

  if (!bundle.type) {
    issues.push({
      severity: "error",
      resourceType: "Bundle",
      path: "type",
      message: "Bundle must have a type (e.g., 'collection', 'document')",
      code: "MISSING_BUNDLE_TYPE",
    });
  }

  if (!bundle.entry || !Array.isArray(bundle.entry)) {
    issues.push({
      severity: "warning",
      resourceType: "Bundle",
      path: "entry",
      message: "Bundle has no entries",
      code: "EMPTY_BUNDLE",
    });
  }

  return issues;
}

/**
 * Validates a FHIR R4 Bundle and returns detailed validation results
 */
export function validateFHIRBundle(bundle: any): ValidationResult {
  const allIssues: ValidationIssue[] = [];
  const resourceCounts: Record<string, number> = {};
  let totalResources = 0;

  // Validate bundle structure
  allIssues.push(...validateBundle(bundle));

  // Validate each resource in the bundle
  if (bundle.entry && Array.isArray(bundle.entry)) {
    for (const entry of bundle.entry) {
      const resource = entry.resource;
      if (!resource) continue;

      totalResources++;
      const resourceType = resource.resourceType || "Unknown";
      resourceCounts[resourceType] = (resourceCounts[resourceType] || 0) + 1;

      // Run all validators
      allIssues.push(...validateRequiredFields(resource));
      allIssues.push(...validateStatusField(resource));
      allIssues.push(...validateCoding(resource));
      allIssues.push(...validatePatientReference(resource));
    }
  }

  // Categorize issues
  const errors = allIssues.filter((i) => i.severity === "error");
  const warnings = allIssues.filter((i) => i.severity === "warning");
  const infos = allIssues.filter((i) => i.severity === "info");

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    infos,
    resourceCounts,
    totalResources,
  };
}

/**
 * Get a human-readable summary of validation results
 */
export function getValidationSummary(result: ValidationResult): string {
  const parts: string[] = [];
  
  parts.push(`${result.totalResources} resources validated`);
  
  if (result.isValid) {
    parts.push("✅ No errors found");
  } else {
    parts.push(`❌ ${result.errors.length} error(s)`);
  }
  
  if (result.warnings.length > 0) {
    parts.push(`⚠️ ${result.warnings.length} warning(s)`);
  }

  return parts.join(" • ");
}
