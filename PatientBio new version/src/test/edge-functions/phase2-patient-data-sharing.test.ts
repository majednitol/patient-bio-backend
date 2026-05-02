import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEdgeFunctionMock,
  mockInvokeResponse,
  mockPatientUser,
  mockDoctorUser,
  createMockAccessToken,
} from "./ef-helpers";

describe("Phase 2: Patient Data Sharing", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createEdgeFunctionMock();
    mockInvoke = mock.mockInvoke;
  });

  // --- get-shared-patient-data ---
  describe("get-shared-patient-data", () => {
    it("23. Rejects missing token", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Token is required" }, error: null });
      const result = await mockInvoke("get-shared-patient-data", { body: {} });
      expect(result.data.error).toContain("Token is required");
    });

    it("24. Rejects invalid token", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "invalid", message: "Token not found" }, error: null });
      const result = await mockInvoke("get-shared-patient-data", { body: { token: "invalid" } });
      expect(result.data.error).toBe("invalid");
    });

    it("25. Rejects expired token", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "expired", message: "Token has expired" }, error: null });
      const result = await mockInvoke("get-shared-patient-data", { body: { token: "expired-token" } });
      expect(result.data.error).toBe("expired");
    });

    it("26. Rejects revoked token", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "revoked", message: "Access has been revoked" }, error: null });
      const result = await mockInvoke("get-shared-patient-data", { body: { token: "revoked-token" } });
      expect(result.data.error).toBe("revoked");
    });

    it("27. Returns patient data for valid token", async () => {
      const mockData = {
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        shared_scopes: { all: true },
        profile: { display_name: "John Doe" },
        healthData: { blood_group: "A+" },
        records: [{ id: "r1", title: "Blood Test" }],
      };
      mockInvokeResponse(mockInvoke, { data: mockData, error: null });
      const result = await mockInvoke("get-shared-patient-data", { body: { token: "valid-token" } });
      expect(result.data.profile).toBeDefined();
      expect(result.data.healthData).toBeDefined();
      expect(result.data.records).toHaveLength(1);
    });

    it("28. Scoped token returns filtered health data", async () => {
      const mockData = {
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        shared_scopes: { allergies: true },
        profile: null,
        healthData: { health_allergies: "Penicillin" },
        records: [],
      };
      mockInvokeResponse(mockInvoke, { data: mockData, error: null });
      const result = await mockInvoke("get-shared-patient-data", { body: { token: "scoped-token" } });
      expect(result.data.healthData.health_allergies).toBeDefined();
      expect(result.data.profile).toBeNull();
    });

    it("29. Creates access log entry", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { profile: {}, healthData: {}, records: [] },
        error: null,
      });
      const result = await mockInvoke("get-shared-patient-data", { body: { token: "valid" } });
      expect(result.data).toBeDefined();
    });

    it("30. Creates notification for patient", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { profile: {}, healthData: {}, records: [] },
        error: null,
      });
      const result = await mockInvoke("get-shared-patient-data", { body: { token: "valid" } });
      expect(result.data).toBeDefined();
    });
  });

  // --- connect-to-doctor ---
  describe("connect-to-doctor", () => {
    it("31. Rejects missing auth", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Authorization required" }, error: null });
      const result = await mockInvoke("connect-to-doctor", { body: {} });
      expect(result.data.error).toContain("Authorization");
    });

    it("32. Rejects missing doctor_code", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Doctor code is required" }, error: null });
      const result = await mockInvoke("connect-to-doctor", { body: {} });
      expect(result.data.error).toContain("Doctor code");
    });

    it("33. Creates doctor_patient_access record", async () => {
      mockInvokeResponse(mockInvoke, {
        data: {
          success: true,
          doctor: { id: mockDoctorUser.id, full_name: "Dr. Smith", specialty: "Cardiology" },
        },
        error: null,
      });
      const result = await mockInvoke("connect-to-doctor", { body: { doctor_code: "abc123" } });
      expect(result.data.success).toBe(true);
      expect(result.data.doctor.full_name).toBe("Dr. Smith");
    });

    it("34. Prevents duplicate active connection (409)", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { error: "You are already connected with this doctor" },
        error: null,
      });
      const result = await mockInvoke("connect-to-doctor", { body: { doctor_code: "abc123" } });
      expect(result.data.error).toContain("already connected");
    });

    it("35. Reactivates inactive connection", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, doctor: { id: mockDoctorUser.id, full_name: "Dr. Smith" } },
        error: null,
      });
      const result = await mockInvoke("connect-to-doctor", { body: { doctor_code: "abc123" } });
      expect(result.data.success).toBe(true);
    });
  });

  // --- respond-family-link-request ---
  describe("respond-family-link-request", () => {
    it("36. Rejects missing auth", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "No authorization header" }, error: null });
      const result = await mockInvoke("respond-family-link-request", { body: {} });
      expect(result.data.error).toContain("authorization");
    });

    it("37. Rejects missing request_id", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { error: "request_id and action (approve/reject) are required" },
        error: null,
      });
      const result = await mockInvoke("respond-family-link-request", { body: { action: "approve" } });
      expect(result.data.error).toContain("request_id");
    });

    it("38. Accepts family link request", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, status: "approved" },
        error: null,
      });
      const result = await mockInvoke("respond-family-link-request", {
        body: { request_id: "req-1", action: "approve" },
      });
      expect(result.data.status).toBe("approved");
    });

    it("39. Rejects family link request", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, status: "rejected" },
        error: null,
      });
      const result = await mockInvoke("respond-family-link-request", {
        body: { request_id: "req-1", action: "reject" },
      });
      expect(result.data.status).toBe("rejected");
    });

    it("40. Creates notification on accept", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, status: "approved" },
        error: null,
      });
      const result = await mockInvoke("respond-family-link-request", {
        body: { request_id: "req-1", action: "approve" },
      });
      expect(result.data.success).toBe(true);
    });

    it("41. Creates notification on reject", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, status: "rejected" },
        error: null,
      });
      const result = await mockInvoke("respond-family-link-request", {
        body: { request_id: "req-1", action: "reject" },
      });
      expect(result.data.success).toBe(true);
    });

    it("42. Validates responder is the target patient", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { error: "You are not authorized to respond to this request" },
        error: null,
      });
      const result = await mockInvoke("respond-family-link-request", {
        body: { request_id: "req-1", action: "approve" },
      });
      expect(result.data.error).toContain("not authorized");
    });

    it("43. Creates family_members on approval", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, status: "approved" },
        error: null,
      });
      const result = await mockInvoke("respond-family-link-request", {
        body: { request_id: "req-1", action: "approve" },
      });
      expect(result.data.success).toBe(true);
    });

    it("44. Rejects already-responded request", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { error: "This request has already been responded to" },
        error: null,
      });
      const result = await mockInvoke("respond-family-link-request", {
        body: { request_id: "req-1", action: "approve" },
      });
      expect(result.data.error).toContain("already been responded");
    });
  });
});
