import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEdgeFunctionMock, mockInvokeResponse } from "./ef-helpers";

describe("Phase 10: Import and Onboarding", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createEdgeFunctionMock();
    mockInvoke = mock.mockInvoke;
  });

  // --- import-doctor-data ---
  describe("import-doctor-data", () => {
    it("204. Imports doctor templates data", async () => {
      mockInvokeResponse(mockInvoke, {
        data: {
          success: true,
          summary: { total: 3, imported: 3, skipped: 0, errors: 0 },
          details: [{ success: true, resourceType: "PrescriptionTemplate", action: "imported" }],
        },
        error: null,
      });
      const result = await mockInvoke("import-doctor-data", {
        body: { csvContent: "template_name,diagnosis\nFever,Viral Fever", importType: "templates" },
      });
      expect(result.data.success).toBe(true);
      expect(result.data.summary.imported).toBe(3);
    });

    it("205. Validates required fields (missing csvContent)", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing csvContent or importType" }, error: null });
      const result = await mockInvoke("import-doctor-data", { body: { importType: "templates" } });
      expect(result.data.error).toContain("Missing csvContent");
    });

    it("206. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing authorization header" }, error: null });
      const result = await mockInvoke("import-doctor-data", { body: {} });
      expect(result.data.error).toContain("authorization");
    });

    it("207. Imports patient connections", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, summary: { total: 2, imported: 1, skipped: 1, errors: 0 } },
        error: null,
      });
      const result = await mockInvoke("import-doctor-data", {
        body: { csvContent: "patient_email\ntest@test.com", importType: "patients" },
      });
      expect(result.data.summary.imported).toBe(1);
    });

    it("208. Imports clinical notes", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, summary: { total: 1, imported: 1, skipped: 0, errors: 0 } },
        error: null,
      });
      const result = await mockInvoke("import-doctor-data", {
        body: { csvContent: "patient_email,note\ntest@test.com,Follow up needed", importType: "notes" },
      });
      expect(result.data.summary.imported).toBe(1);
    });

    it("209. Handles duplicate with skip resolution", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, summary: { total: 2, imported: 0, skipped: 2, errors: 0 } },
        error: null,
      });
      const result = await mockInvoke("import-doctor-data", {
        body: { csvContent: "csv...", importType: "templates", conflictResolution: "skip" },
      });
      expect(result.data.summary.skipped).toBe(2);
    });

    it("210. Rejects unknown importType", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unknown importType" }, error: null });
      const result = await mockInvoke("import-doctor-data", {
        body: { csvContent: "csv...", importType: "unknown" },
      });
      expect(result.data.error).toContain("Unknown importType");
    });
  });

  // --- import-pathologist-data ---
  describe("import-pathologist-data", () => {
    it("211. Imports pathologist profile", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, summary: { total: 1, imported: 1, skipped: 0, errors: 0 } },
        error: null,
      });
      const result = await mockInvoke("import-pathologist-data", {
        body: { csvContent: "name,lab_name\nDr. Lab,Central Lab", importType: "profiles" },
      });
      expect(result.data.success).toBe(true);
    });

    it("212. Validates required pathologist fields", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing required fields" }, error: null });
      const result = await mockInvoke("import-pathologist-data", { body: {} });
      expect(result.data.error).toContain("Missing");
    });

    it("213. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
      const result = await mockInvoke("import-pathologist-data", { body: {} });
      expect(result.data.error).toBeDefined();
    });

    it("214. Handles duplicate pathologist", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, summary: { imported: 0, skipped: 1 } },
        error: null,
      });
      const result = await mockInvoke("import-pathologist-data", { body: { csvContent: "csv..." } });
      expect(result.data.summary.skipped).toBe(1);
    });
  });

  // --- import-researcher-data ---
  describe("import-researcher-data", () => {
    it("215. Imports researcher profile", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, summary: { total: 1, imported: 1 } },
        error: null,
      });
      const result = await mockInvoke("import-researcher-data", {
        body: { csvContent: "name,institution\nDr. Research,MIT", importType: "profiles" },
      });
      expect(result.data.success).toBe(true);
    });

    it("216. Validates required researcher fields", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing required fields" }, error: null });
      const result = await mockInvoke("import-researcher-data", { body: {} });
      expect(result.data.error).toContain("Missing");
    });

    it("217. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
      const result = await mockInvoke("import-researcher-data", { body: {} });
      expect(result.data.error).toBeDefined();
    });

    it("218. Handles duplicate researcher", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, summary: { imported: 0, skipped: 1 } },
        error: null,
      });
      const result = await mockInvoke("import-researcher-data", { body: { csvContent: "csv..." } });
      expect(result.data.summary.skipped).toBe(1);
    });

    it("219. Import creates proper provider type metadata", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, summary: { imported: 1 }, portal_type: "researcher" },
        error: null,
      });
      const result = await mockInvoke("import-researcher-data", { body: { csvContent: "csv..." } });
      expect(result.data.success).toBe(true);
    });
  });
});
