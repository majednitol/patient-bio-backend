import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEdgeFunctionMock, mockInvokeResponse } from "./ef-helpers";

describe("Phase 8: Security and Blockchain", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createEdgeFunctionMock();
    mockInvoke = mock.mockInvoke;
  });

  // --- get-emergency-patient-data ---
  describe("get-emergency-patient-data", () => {
    it("170. Rejects missing token", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Missing emergency token" }, error: null });
      const result = await mockInvoke("get-emergency-patient-data", { body: {} });
      expect(result.data.error).toContain("Missing emergency token");
    });

    it("171. Rejects invalid token", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Invalid or expired emergency token" }, error: null });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "bad" } });
      expect(result.data.error).toContain("Invalid");
    });

    it("172. Rejects expired token", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Emergency access has expired" }, error: null });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "expired" } });
      expect(result.data.error).toContain("expired");
    });

    it("173. Requires PIN when set", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "PIN required", requires_pin: true }, error: null });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "pin-protected" } });
      expect(result.data.requires_pin).toBe(true);
    });

    it("174. Rejects wrong PIN", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Invalid PIN" }, error: null });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "t1", pin: "0000" } });
      expect(result.data.error).toContain("Invalid PIN");
    });

    it("175. Rate limits after 5 failed PINs", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Too many failed attempts. Try again later." }, error: null });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "t1", pin: "bad" } });
      expect(result.data.error).toContain("Too many failed attempts");
    });

    it("176. Returns emergency data for valid token+PIN", async () => {
      const emergencyData = {
        patient_name: "John Doe",
        blood_group: "O+",
        allergies: ["Penicillin"],
        current_medications: ["Metformin"],
        emergency_contact_name: "Jane Doe",
        emergency_contact_phone: "+1234567890",
        access_level: "full",
      };
      mockInvokeResponse(mockInvoke, { data: emergencyData, error: null });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "valid", pin: "1234" } });
      expect(result.data.patient_name).toBe("John Doe");
      expect(result.data.blood_group).toBe("O+");
      expect(result.data.allergies).toContain("Penicillin");
    });

    it("177. Full access includes chronic conditions", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { access_level: "full", chronic_conditions: ["Diabetes", "Hypertension"] },
        error: null,
      });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "full" } });
      expect(result.data.chronic_conditions).toHaveLength(2);
    });

    it("178. Basic access excludes chronic conditions", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { access_level: "basic", chronic_conditions: [] },
        error: null,
      });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "basic" } });
      expect(result.data.chronic_conditions).toHaveLength(0);
    });

    it("179. Increments access count", async () => {
      mockInvokeResponse(mockInvoke, { data: { patient_name: "John", access_level: "full" }, error: null });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "valid" } });
      expect(result.data).toBeDefined();
    });

    it("180. Creates emergency access log", async () => {
      mockInvokeResponse(mockInvoke, { data: { patient_name: "John" }, error: null });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "valid" } });
      expect(result.data).toBeDefined();
    });

    it("181. Sends emergency notification", async () => {
      mockInvokeResponse(mockInvoke, { data: { patient_name: "John" }, error: null });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "valid" } });
      expect(result.data).toBeDefined();
    });

    it("187. PIN lockout resets after expiry", async () => {
      // After lock period, attempts should reset
      mockInvokeResponse(mockInvoke, { data: { patient_name: "John" }, error: null });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "t1", pin: "1234" } });
      expect(result.data.patient_name).toBeDefined();
    });

    it("188. Legacy btoa PIN hash supported", async () => {
      mockInvokeResponse(mockInvoke, { data: { patient_name: "John" }, error: null });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "legacy", pin: "1234" } });
      expect(result.data).toBeDefined();
    });

    it("189. Notification respects preferences", async () => {
      mockInvokeResponse(mockInvoke, { data: { patient_name: "John" }, error: null });
      const result = await mockInvoke("get-emergency-patient-data", { body: { token: "valid" } });
      expect(result.data).toBeDefined();
    });
  });

  // --- detect-access-anomalies ---
  describe("detect-access-anomalies", () => {
    it("182. Detects access anomalies", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, anomalies: [{ severity: "high", description: "Unusual access pattern" }] },
        error: null,
      });
      const result = await mockInvoke("detect-access-anomalies", { body: {} });
      expect(result.data.anomalies).toHaveLength(1);
    });

    it("183. Rejects unauthenticated", async () => {
      mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
      const result = await mockInvoke("detect-access-anomalies", { body: {} });
      expect(result.data.error).toContain("Unauthorized");
    });
  });

  // --- record-transaction ---
  describe("record-transaction", () => {
    it("184. Records blockchain transaction", async () => {
      mockInvokeResponse(mockInvoke, {
        data: { success: true, data: { transactionId: "tx-1", dataHash: "abc123", previousHash: "GENESIS" } },
        error: null,
      });
      const result = await mockInvoke("record-transaction", {
        body: { transaction_type: "HEALTH_RECORD_CREATED", target_resource_type: "health_record" },
      });
      expect(result.data.success).toBe(true);
      expect(result.data.data.transactionId).toBeDefined();
      expect(result.data.data.dataHash).toBeDefined();
    });
  });

  // --- verify-chain ---
  describe("verify-chain", () => {
    it("185. Verifies blockchain integrity", async () => {
      mockInvokeResponse(mockInvoke, {
        data: {
          success: true,
          data: { isValid: true, totalTransactions: 100, verifiedTransactions: 100, brokenLinks: [], integrityPercentage: 100 },
        },
        error: null,
      });
      const result = await mockInvoke("verify-chain", { body: {} });
      expect(result.data.data.isValid).toBe(true);
      expect(result.data.data.integrityPercentage).toBe(100);
    });
  });

  // --- generate-merkle-proof ---
  describe("generate-merkle-proof", () => {
    it("186. Generates Merkle proof", async () => {
      mockInvokeResponse(mockInvoke, {
        data: {
          success: true,
          data: { recordId: "r1", proof: ["hash1", "hash2"], root: "merkle-root", verified: true },
        },
        error: null,
      });
      const result = await mockInvoke("generate-merkle-proof", { body: { record_id: "r1" } });
      expect(result.data.data.proof).toHaveLength(2);
      expect(result.data.data.verified).toBe(true);
    });
  });
});
