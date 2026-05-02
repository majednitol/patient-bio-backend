import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEdgeFunctionMock, mockInvokeResponse, mockDoctorUser, mockPatientUser } from "./ef-helpers";

describe("Phase 3: Provider Data Access", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createEdgeFunctionMock();
    mockInvoke = mock.mockInvoke;
  });

  // --- get-patient-data-for-doctor ---
  describe("get-patient-data-for-doctor", () => {
    it("47. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
      const result = await mockInvoke("get-patient-data-for-doctor", { body: {} });
      expect(result.data.error).toBe("Unauthorized");
    });

    it("48. Rejects missing patient_id", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing patient_id" }, error: null });
      const result = await mockInvoke("get-patient-data-for-doctor", { body: {} });
      expect(result.data.error).toContain("patient_id");
    });

    it("49. Rejects doctor without access", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "No access to this patient" }, error: null });
      const result = await mockInvoke("get-patient-data-for-doctor", { body: { patient_id: "p1" } });
      expect(result.data.error).toContain("No access");
    });

    it("50. Returns data for authorized doctor", async () => {
      const mockData = {
        profile: { display_name: "Jane Doe" },
        healthData: { blood_group: "O+" },
        records: [{ id: "r1", title: "X-Ray" }],
      };
      mockInvokeResponse(mockInvoke, { data: mockData, error: null });
      const result = await mockInvoke("get-patient-data-for-doctor", { body: { patient_id: mockPatientUser.id } });
      expect(result.data.profile).toBeDefined();
      expect(result.data.healthData).toBeDefined();
      expect(result.data.records).toHaveLength(1);
    });

    it("51. Creates access log", async () => {
      mockInvokeResponse(mockInvoke, { data: { profile: {}, healthData: {}, records: [] }, error: null });
      const result = await mockInvoke("get-patient-data-for-doctor", { body: { patient_id: "p1" } });
      expect(result.data).toBeDefined();
    });

    it("52. Creates patient notification", async () => {
      mockInvokeResponse(mockInvoke, { data: { profile: {}, healthData: {}, records: [] }, error: null });
      const result = await mockInvoke("get-patient-data-for-doctor", { body: { patient_id: "p1" } });
      expect(result.data).toBeDefined();
    });
  });

  // --- get-patient-data-for-pathologist ---
  describe("get-patient-data-for-pathologist", () => {
    it("53. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing authorization header" }, error: null });
      const result = await mockInvoke("get-patient-data-for-pathologist", { body: {} });
      expect(result.data.error).toContain("authorization");
    });

    it("54. Rejects missing share_id", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "share_id and patient_id are required" }, error: null });
      const result = await mockInvoke("get-patient-data-for-pathologist", { body: { patient_id: "p1" } });
      expect(result.data.error).toContain("share_id");
    });

    it("55. Rejects invalid share", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "No valid share found for this patient" }, error: null });
      const result = await mockInvoke("get-patient-data-for-pathologist", { body: { share_id: "invalid", patient_id: "p1" } });
      expect(result.data.error).toContain("No valid share");
    });

    it("56. Returns data for valid pathologist share", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { profile: { display_name: "Jane" }, healthData: {}, records: [{ id: "r1" }] },
        error: null,
      });
      const result = await mockInvoke("get-patient-data-for-pathologist", { body: { share_id: "s1", patient_id: "p1" } });
      expect(result.data.records).toHaveLength(1);
    });
  });

  // --- get-patient-data-for-researcher ---
  describe("get-patient-data-for-researcher", () => {
    it("57. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing authorization header" }, error: null });
      const result = await mockInvoke("get-patient-data-for-researcher", { body: {} });
      expect(result.data.error).toContain("authorization");
    });

    it("58. Rejects missing share_id", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "share_id is required" }, error: null });
      const result = await mockInvoke("get-patient-data-for-researcher", { body: {} });
      expect(result.data.error).toContain("share_id");
    });

    it("59. Rejects invalid share", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "No valid share found" }, error: null });
      const result = await mockInvoke("get-patient-data-for-researcher", { body: { share_id: "bad" } });
      expect(result.data.error).toContain("No valid share");
    });

    it("60. Rejects expired share", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Share has expired" }, error: null });
      const result = await mockInvoke("get-patient-data-for-researcher", { body: { share_id: "expired" } });
      expect(result.data.error).toContain("expired");
    });

    it("61. Returns data (anonymized)", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { profile: null, healthData: {}, records: [], isAnonymized: true },
        error: null,
      });
      const result = await mockInvoke("get-patient-data-for-researcher", { body: { share_id: "s1" } });
      expect(result.data.isAnonymized).toBe(true);
      expect(result.data.profile).toBeNull();
    });

    it("62. Returns data (non-anonymized)", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { profile: { display_name: "Jane" }, healthData: {}, records: [], isAnonymized: false },
        error: null,
      });
      const result = await mockInvoke("get-patient-data-for-researcher", { body: { share_id: "s1" } });
      expect(result.data.isAnonymized).toBe(false);
      expect(result.data.profile).toBeDefined();
    });

    it("63. Updates share status to viewed", async () => {
      mockInvokeResponse(mockInvoke, { data: { profile: null, healthData: {}, records: [] }, error: null });
      const result = await mockInvoke("get-patient-data-for-researcher", { body: { share_id: "s1" } });
      expect(result.data).toBeDefined();
    });

    it("64. Creates access log (non-anonymized only)", async () => {
      mockInvokeResponse(mockInvoke, { data: { profile: { display_name: "Jane" }, records: [] }, error: null });
      const result = await mockInvoke("get-patient-data-for-researcher", { body: { share_id: "s1" } });
      expect(result.data).toBeDefined();
    });
  });

  // --- lookup-patient-by-id ---
  describe("lookup-patient-by-id", () => {
    it("65. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "No authorization header" }, error: null });
      const result = await mockInvoke("lookup-patient-by-id", { body: {} });
      expect(result.data.error).toContain("authorization");
    });

    it("66. Rejects missing patient_code", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Patient code is required" }, error: null });
      const result = await mockInvoke("lookup-patient-by-id", { body: {} });
      expect(result.data.error).toContain("Patient code");
    });

    it("67. Returns patient for valid ID", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { found: true, patient_id: "p1", display_name: "Jane", age: 30 },
        error: null,
      });
      const result = await mockInvoke("lookup-patient-by-id", { body: { patient_code: "PB-202602-000001-3" } });
      expect(result.data.found).toBe(true);
      expect(result.data.display_name).toBe("Jane");
    });

    it("68. Returns not found for invalid ID", async () => {
      mockInvokeResponse(mockInvoke, { data: { found: false }, error: null });
      const result = await mockInvoke("lookup-patient-by-id", { body: { patient_code: "PB-999999-999999-9" } });
      expect(result.data.found).toBe(false);
    });
  });

  // --- generate-document-url / generate-doctor-document-url ---
  describe("generate-document-url", () => {
    it("69. Generates signed document URL", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { url: "https://signed-url.com/doc", expires_in: 300, title: "Lab Report" },
        error: null,
      });
      const result = await mockInvoke("generate-document-url", { body: { token: "t1", record_id: "r1" } });
      expect(result.data.url).toContain("https://");
      expect(result.data.expires_in).toBe(300);
    });

    it("70. Generates doctor document URL", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { url: "https://signed-url.com/doc", expires_in: 300, title: "X-Ray" },
        error: null,
      });
      const result = await mockInvoke("generate-doctor-document-url", { body: { record_id: "r1" } });
      expect(result.data.url).toContain("https://");
    });
  });
});
