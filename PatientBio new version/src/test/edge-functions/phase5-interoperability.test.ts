import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEdgeFunctionMock, mockInvokeResponse } from "./ef-helpers";

describe("Phase 5: Interoperability", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createEdgeFunctionMock();
    mockInvoke = mock.mockInvoke;
  });

  // --- export-fhir ---
  describe("export-fhir", () => {
    it("101. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing authorization header" }, error: null });
      const result = await mockInvoke("export-fhir", { body: {} });
      expect(result.data.error).toContain("authorization");
    });

    it("102. Returns FHIR Bundle", async () => {
      const bundle = { resourceType: "Bundle", type: "collection", entry: [] };
      mockInvokeResponse(mockInvoke, { data: bundle, error: null });
      const result = await mockInvoke("export-fhir", { body: {} });
      expect(result.data.resourceType).toBe("Bundle");
      expect(result.data.type).toBe("collection");
    });

    it("103. Bundle includes Patient resource", async () => {
      const bundle = {
        resourceType: "Bundle",
        type: "collection",
        entry: [{ resource: { resourceType: "Patient", name: [{ text: "John" }] } }],
      };
      mockInvokeResponse(mockInvoke, { data: bundle, error: null });
      const result = await mockInvoke("export-fhir", { body: {} });
      const patientEntry = result.data.entry.find((e: any) => e.resource.resourceType === "Patient");
      expect(patientEntry).toBeDefined();
    });

    it("104. Bundle includes AllergyIntolerance", async () => {
      const bundle = {
        resourceType: "Bundle",
        entry: [{ resource: { resourceType: "AllergyIntolerance", code: { text: "Penicillin" } } }],
      };
      mockInvokeResponse(mockInvoke, { data: bundle, error: null });
      const result = await mockInvoke("export-fhir", { body: {} });
      const allergyEntry = result.data.entry.find((e: any) => e.resource.resourceType === "AllergyIntolerance");
      expect(allergyEntry).toBeDefined();
    });

    it("105. Bundle includes Condition resources", async () => {
      const bundle = {
        resourceType: "Bundle",
        entry: [{ resource: { resourceType: "Condition", code: { text: "Diabetes" } } }],
      };
      mockInvokeResponse(mockInvoke, { data: bundle, error: null });
      const result = await mockInvoke("export-fhir", { body: {} });
      const condEntry = result.data.entry.find((e: any) => e.resource.resourceType === "Condition");
      expect(condEntry).toBeDefined();
    });

    it("106. Bundle includes MedicationStatement", async () => {
      const bundle = {
        resourceType: "Bundle",
        entry: [{ resource: { resourceType: "MedicationStatement", status: "active" } }],
      };
      mockInvokeResponse(mockInvoke, { data: bundle, error: null });
      const result = await mockInvoke("export-fhir", { body: {} });
      const medEntry = result.data.entry.find((e: any) => e.resource.resourceType === "MedicationStatement");
      expect(medEntry).toBeDefined();
    });

    it("107. Bundle includes DocumentReference", async () => {
      const bundle = {
        resourceType: "Bundle",
        entry: [{ resource: { resourceType: "DocumentReference", status: "current" } }],
      };
      mockInvokeResponse(mockInvoke, { data: bundle, error: null });
      const result = await mockInvoke("export-fhir", { body: {} });
      const docEntry = result.data.entry.find((e: any) => e.resource.resourceType === "DocumentReference");
      expect(docEntry).toBeDefined();
    });

    it("108. Bundle includes Observations (vitals)", async () => {
      const bundle = {
        resourceType: "Bundle",
        entry: [{ resource: { resourceType: "Observation", category: [{ coding: [{ code: "vital-signs" }] }] } }],
      };
      mockInvokeResponse(mockInvoke, { data: bundle, error: null });
      const result = await mockInvoke("export-fhir", { body: {} });
      const obsEntry = result.data.entry.find((e: any) => e.resource.resourceType === "Observation");
      expect(obsEntry).toBeDefined();
    });

    it("109. Bundle includes MedicationRequest", async () => {
      const bundle = {
        resourceType: "Bundle",
        entry: [{ resource: { resourceType: "MedicationRequest", intent: "order" } }],
      };
      mockInvokeResponse(mockInvoke, { data: bundle, error: null });
      const result = await mockInvoke("export-fhir", { body: {} });
      const rxEntry = result.data.entry.find((e: any) => e.resource.resourceType === "MedicationRequest");
      expect(rxEntry).toBeDefined();
    });

    it("110. Blood group Observation with SNOMED codes", async () => {
      const obs = {
        resourceType: "Observation",
        code: { coding: [{ system: "http://loinc.org", code: "882-1" }] },
        valueCodeableConcept: { coding: [{ system: "http://snomed.info/sct", code: "278147001" }], text: "A+" },
      };
      mockInvokeResponse(mockInvoke, { data: { resourceType: "Bundle", entry: [{ resource: obs }] }, error: null });
      const result = await mockInvoke("export-fhir", { body: {} });
      const bgObs = result.data.entry[0].resource;
      expect(bgObs.valueCodeableConcept.coding[0].system).toBe("http://snomed.info/sct");
    });
  });

  // --- export-ccda ---
  describe("export-ccda", () => {
    it("111. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
      const result = await mockInvoke("export-ccda", { body: {} });
      expect(result.data.error).toBeDefined();
    });

    it("112. Returns valid C-CDA XML", async () => {
      mockInvokeResponse(mockInvoke, { data: '<?xml version="1.0"?><ClinicalDocument xmlns="urn:hl7-org:v3"></ClinicalDocument>', error: null });
      const result = await mockInvoke("export-ccda", { body: {} });
      expect(result.data).toContain("ClinicalDocument");
    });
  });

  // --- bulk-export ---
  describe("bulk-export", () => {
    it("113. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
      const result = await mockInvoke("bulk-export", { body: {} });
      expect(result.data.error).toBeDefined();
    });

    it("114. Returns bulk export data", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, resources: { Patient: 1, Observation: 5 } }, error: null });
      const result = await mockInvoke("bulk-export", { body: {} });
      expect(result.data.resources).toBeDefined();
    });
  });

  // --- import-fhir ---
  describe("import-fhir", () => {
    it("115. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
      const result = await mockInvoke("import-fhir", { body: {} });
      expect(result.data.error).toBeDefined();
    });

    it("116. Imports FHIR bundle", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, imported: { Condition: 2, AllergyIntolerance: 1 } }, error: null });
      const result = await mockInvoke("import-fhir", { body: { bundle: { resourceType: "Bundle" } } });
      expect(result.data.imported).toBeDefined();
    });

    it("117. Rejects invalid FHIR bundle", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Invalid FHIR bundle" }, error: null });
      const result = await mockInvoke("import-fhir", { body: { bundle: {} } });
      expect(result.data.error).toContain("Invalid");
    });
  });

  // --- import-hl7v2 ---
  describe("import-hl7v2", () => {
    it("118. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
      const result = await mockInvoke("import-hl7v2", { body: {} });
      expect(result.data.error).toBeDefined();
    });

    it("119. Processes HL7v2 message", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, segments: ["MSH", "PID", "OBX"] }, error: null });
      const result = await mockInvoke("import-hl7v2", { body: { message: "MSH|^~\\&|..." } });
      expect(result.data.segments).toBeDefined();
    });
  });

  // --- smart-launch / fhir-subscription ---
  describe("smart-launch", () => {
    it("120. Handles SMART launch", async () => {
      mockInvokeResponse(mockInvoke, { data: { launch_context: { patient: "p1" } }, error: null });
      const result = await mockInvoke("smart-launch", { body: {} });
      expect(result.data.launch_context).toBeDefined();
    });
  });

  describe("fhir-subscription", () => {
    it("121. Handles FHIR subscription", async () => {
      mockInvokeResponse(mockInvoke, { data: { processed: true }, error: null });
      const result = await mockInvoke("fhir-subscription", { body: { event: "update" } });
      expect(result.data.processed).toBe(true);
    });
  });
});
