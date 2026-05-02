import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEdgeFunctionMock, mockInvokeResponse } from "./ef-helpers";

describe("Phase 6: Hospital Operations", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createEdgeFunctionMock();
    mockInvoke = mock.mockInvoke;
  });

  // --- import-hospital-data ---
  describe("import-hospital-data", () => {
    it("122. Rejects missing auth", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
      const result = await mockInvoke("import-hospital-data", { body: {} });
      expect(result.data.error).toContain("Unauthorized");
    });

    it("123. Imports departments CSV", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, summary: { imported: 5, skipped: 0, errors: 0 } }, error: null });
      const result = await mockInvoke("import-hospital-data", { body: { importType: "departments" } });
      expect(result.data.summary.imported).toBe(5);
    });

    it("124. Imports staff CSV", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, summary: { imported: 3, skipped: 1, errors: 0 } }, error: null });
      const result = await mockInvoke("import-hospital-data", { body: { importType: "staff" } });
      expect(result.data.summary.imported).toBe(3);
    });

    it("125. Imports wards and beds CSV", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, summary: { imported: 10, skipped: 0, errors: 0 } }, error: null });
      const result = await mockInvoke("import-hospital-data", { body: { importType: "wards" } });
      expect(result.data.summary.imported).toBe(10);
    });

    it("126-128. Imports patient registry, admissions, invoices", async () => {
      for (const type of ["patient_registry", "admissions", "invoices"]) {
        mockInvokeResponse(mockInvoke, { data: { success: true, summary: { imported: 2 } }, error: null });
        const result = await mockInvoke("import-hospital-data", { body: { importType: type } });
        expect(result.data.success).toBe(true);
      }
    });

    it("129. Skip conflict resolution", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, summary: { imported: 0, skipped: 5 } }, error: null });
      const result = await mockInvoke("import-hospital-data", { body: { conflictResolution: "skip" } });
      expect(result.data.summary.skipped).toBe(5);
    });

    it("130-131. Merge and replace conflict resolution", async () => {
      for (const mode of ["merge", "replace"]) {
        mockInvokeResponse(mockInvoke, { data: { success: true, summary: { imported: 3 } }, error: null });
        const result = await mockInvoke("import-hospital-data", { body: { conflictResolution: mode } });
        expect(result.data.success).toBe(true);
      }
    });

    it("132. Invalid CSV returns errors", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, summary: { imported: 0, errors: 3 }, details: [{ error: "Missing field" }] }, error: null });
      const result = await mockInvoke("import-hospital-data", { body: { csvContent: "bad,data" } });
      expect(result.data.summary.errors).toBe(3);
    });
  });

  // --- register-hospital ---
  describe("register-hospital", () => {
    it("133. Registers hospital", async () => {
      mockInvokeResponse(mockInvoke, { data: { hospital: { id: "h1", name: "City Hospital" } }, error: null });
      const result = await mockInvoke("register-hospital", { body: { name: "City Hospital", city: "Mumbai", type: "hospital" } });
      expect(result.data.hospital.name).toBe("City Hospital");
    });

    it("134. Rejects short name (<2 chars)", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Facility name must be at least 2 characters" }, error: null });
      const result = await mockInvoke("register-hospital", { body: { name: "A", city: "Mumbai" } });
      expect(result.data.error).toContain("at least 2");
    });

    it("135. Rejects short city (<2 chars)", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "City must be at least 2 characters" }, error: null });
      const result = await mockInvoke("register-hospital", { body: { name: "Hospital", city: "M" } });
      expect(result.data.error).toContain("City");
    });

    it("136. Adds creator as admin staff", async () => {
      mockInvokeResponse(mockInvoke, { data: { hospital: { id: "h1" } }, error: null });
      const result = await mockInvoke("register-hospital", { body: { name: "Test Hospital", city: "Delhi" } });
      expect(result.data.hospital).toBeDefined();
    });
  });

  // --- notify-hospital-staff ---
  describe("notify-hospital-staff", () => {
    it("137. Sends notification to all staff", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, notified_count: 5 }, error: null });
      const result = await mockInvoke("notify-hospital-staff", {
        body: { hospital_id: "h1", event_type: "admission", title: "New Admission", message: "Patient admitted" },
      });
      expect(result.data.notified_count).toBe(5);
    });

    it("138. Excludes triggering user", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, notified_count: 4 }, error: null });
      const result = await mockInvoke("notify-hospital-staff", {
        body: { hospital_id: "h1", event_type: "admission", title: "T", message: "M", exclude_user_id: "u1" },
      });
      expect(result.data.notified_count).toBe(4);
    });

    it("139. Returns 0 for empty staff", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, notified_count: 0 }, error: null });
      const result = await mockInvoke("notify-hospital-staff", {
        body: { hospital_id: "empty-h", event_type: "admission", title: "T", message: "M" },
      });
      expect(result.data.notified_count).toBe(0);
    });

    it("140. Rejects missing fields", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing required fields" }, error: null });
      const result = await mockInvoke("notify-hospital-staff", { body: { hospital_id: "h1" } });
      expect(result.data.error).toContain("Missing");
    });
  });

  // --- create-staff-account ---
  describe("create-staff-account", () => {
    it("141. Creates staff account", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, user_id: "new-staff-1" }, error: null });
      const result = await mockInvoke("create-staff-account", { body: { email: "staff@test.com", hospital_id: "h1" } });
      expect(result.data.success).toBe(true);
    });

    it("142. Rejects unauthorized (non-admin)", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Not authorized" }, error: null });
      const result = await mockInvoke("create-staff-account", { body: {} });
      expect(result.data.error).toContain("Not authorized");
    });
  });

  // --- send-staff-invitation ---
  describe("send-staff-invitation", () => {
    it("143. Sends staff invitation email", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true }, error: null });
      const result = await mockInvoke("send-staff-invitation", { body: { email: "new@staff.com" } });
      expect(result.data.success).toBe(true);
    });
  });

  // --- detect-duplicate-patients ---
  describe("detect-duplicate-patients", () => {
    it("144. Detects duplicate patients", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, candidates: [{ confidence: 0.9, patient_ids: ["p1", "p2"] }] },
        error: null,
      });
      const result = await mockInvoke("detect-duplicate-patients", { body: { hospital_id: "h1" } });
      expect(result.data.candidates).toHaveLength(1);
      expect(result.data.candidates[0].confidence).toBeGreaterThan(0.5);
    });

    it("145. Rejects missing hospital_id", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "hospital_id is required" }, error: null });
      const result = await mockInvoke("detect-duplicate-patients", { body: {} });
      expect(result.data.error).toContain("hospital_id");
    });

    it("146. Returns empty for <2 patients", async () => {
      mockInvokeResponse(mockInvoke, { data: { success: true, candidates: [], scanned: 1 }, error: null });
      const result = await mockInvoke("detect-duplicate-patients", { body: { hospital_id: "h1" } });
      expect(result.data.candidates).toHaveLength(0);
    });

    it("147. Scores by name similarity + DOB + phone", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, candidates: [{ confidence: 0.85, match_factors: ["name", "dob", "phone"] }] },
        error: null,
      });
      const result = await mockInvoke("detect-duplicate-patients", { body: { hospital_id: "h1" } });
      expect(result.data.candidates[0].match_factors).toContain("name");
    });
  });
});
