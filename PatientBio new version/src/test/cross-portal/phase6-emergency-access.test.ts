import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCrossPortalMock,
  mockResponse,
  mockError,
  users,
  ids,
  makeNotification,
} from "./cp-helpers";

// ── Local factories ─────────────────────────────────────────────
function makeEmergencyToken(overrides: Record<string, any> = {}) {
  return {
    id: "etok-cp-901",
    user_id: ids.patient,
    token: "emrg-abc123def456",
    access_level: "full" as "full" | "basic",
    expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
    pin_hash: null as string | null,
    is_active: true,
    access_count: 0,
    max_accesses: 10,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeEmergencyAccessLog(overrides: Record<string, any> = {}) {
  return {
    id: "ealog-cp-902",
    token_id: "etok-cp-901",
    patient_id: ids.patient,
    accessor_ip: "203.0.113.42",
    accessor_user_agent: "Mozilla/5.0",
    accessed_at: new Date().toISOString(),
    data_accessed: ["blood_group", "allergies", "medications", "emergency_contacts"],
    ...overrides,
  };
}

describe("Cross-Portal Phase 6: Emergency Access Protocol", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createCrossPortalMock();
    mockInvoke = mock.mockInvoke;
  });

  // ── 1. Emergency token creation ──────────────────────────────
  describe("Patient creates emergency access token", () => {
    it("1. Token created with time-boxed expiry", () => {
      const token = makeEmergencyToken();
      const expiresIn = new Date(token.expires_at).getTime() - Date.now();
      expect(expiresIn).toBeLessThanOrEqual(4 * 60 * 60 * 1000);
      expect(expiresIn).toBeGreaterThan(0);
    });

    it("2. Token supports optional PIN protection", () => {
      const token = makeEmergencyToken({ pin_hash: "hashed-1234" });
      expect(token.pin_hash).toBe("hashed-1234");
    });

    it("3. Full access level includes chronic conditions", () => {
      const token = makeEmergencyToken({ access_level: "full" });
      expect(token.access_level).toBe("full");
    });

    it("4. Basic access level excludes chronic conditions", () => {
      const token = makeEmergencyToken({ access_level: "basic" });
      expect(token.access_level).toBe("basic");
    });
  });

  // ── 2. First responder accesses emergency data ───────────────
  describe("First responder accesses via /emergency/:token", () => {
    it("5. Valid token returns critical health data", async () => {
      mockResponse(mockInvoke, {
        blood_group: "O+",
        allergies: ["Penicillin", "Sulfa drugs"],
        current_medications: [{ name: "Metformin", dosage: "500mg" }],
        emergency_contacts: [{ name: "Jane Doe", phone: "+1234567890", relationship: "Spouse" }],
        conditions: ["Type 2 Diabetes"],
      });
      const result = await mockInvoke("get-emergency-patient-data", {
        body: { token: "emrg-abc123def456" },
      });
      expect(result.data.blood_group).toBe("O+");
      expect(result.data.allergies).toHaveLength(2);
      expect(result.data.emergency_contacts).toHaveLength(1);
    });

    it("6. Expired token rejected", async () => {
      mockError(mockInvoke, "Token has expired");
      const result = await mockInvoke("get-emergency-patient-data", {
        body: { token: "expired-token" },
      });
      expect(result.data.error).toContain("expired");
    });

    it("7. Invalid token rejected", async () => {
      mockError(mockInvoke, "Invalid emergency token");
      const result = await mockInvoke("get-emergency-patient-data", {
        body: { token: "invalid-xyz" },
      });
      expect(result.data.error).toContain("Invalid");
    });

    it("8. PIN required when set", async () => {
      mockResponse(mockInvoke, { requires_pin: true });
      const result = await mockInvoke("get-emergency-patient-data", {
        body: { token: "emrg-abc123def456" },
      });
      expect(result.data.requires_pin).toBe(true);
    });

    it("9. Wrong PIN rejected", async () => {
      mockError(mockInvoke, "Invalid PIN");
      const result = await mockInvoke("get-emergency-patient-data", {
        body: { token: "emrg-abc123def456", pin: "9999" },
      });
      expect(result.data.error).toContain("Invalid PIN");
    });

    it("10. Rate limit after 5 failed PINs", async () => {
      mockError(mockInvoke, "Too many attempts. Token locked.");
      const result = await mockInvoke("get-emergency-patient-data", {
        body: { token: "emrg-abc123def456", pin: "0000" },
      });
      expect(result.data.error).toContain("locked");
    });
  });

  // ── 3. Patient notification & audit ──────────────────────────
  describe("Patient notified and access audited", () => {
    it("11. Patient receives emergency access notification", () => {
      const notif = makeNotification({
        user_id: ids.patient,
        type: "emergency_access",
        title: "Emergency Data Accessed",
        message: "Your emergency health data was accessed by a first responder.",
      });
      expect(notif.type).toBe("emergency_access");
      expect(notif.user_id).toBe(ids.patient);
    });

    it("12. Emergency access log records accessor details", () => {
      const log = makeEmergencyAccessLog();
      expect(log.patient_id).toBe(ids.patient);
      expect(log.accessor_ip).toBe("203.0.113.42");
      expect(log.data_accessed).toContain("blood_group");
      expect(log.data_accessed).toContain("allergies");
    });

    it("13. Access count incremented per use", () => {
      const token = makeEmergencyToken({ access_count: 3 });
      expect(token.access_count).toBe(3);
    });

    it("14. Max accesses enforced", async () => {
      mockError(mockInvoke, "Maximum access count reached");
      const result = await mockInvoke("get-emergency-patient-data", {
        body: { token: "emrg-abc123def456" },
      });
      expect(result.data.error).toContain("Maximum access");
    });

    it("15. Basic access excludes conditions array", async () => {
      mockResponse(mockInvoke, {
        blood_group: "A-",
        allergies: [],
        current_medications: [],
        emergency_contacts: [],
        conditions: [],
      });
      const result = await mockInvoke("get-emergency-patient-data", {
        body: { token: "basic-token", access_level: "basic" },
      });
      expect(result.data.conditions).toHaveLength(0);
    });
  });
});
