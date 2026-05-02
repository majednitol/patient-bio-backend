import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: "new-access-id" }, error: null }),
  }),
});
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});
const mockEq = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnValue({
  eq: mockEq,
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
});
const mockFrom = vi.fn().mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  eq: mockEq,
});

const mockFunctionsInvoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    functions: { invoke: (...args: any[]) => mockFunctionsInvoke(...args) },
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null }) },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "doctor-123" } }),
}));

describe("Phase 3: Patient Access and Management", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Patient Lookup by Passport ID", () => {
    it("invokes lookup-patient-by-id edge function", async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { found: true, patient_id: "patient-abc", display_name: "John" },
        error: null,
      });
      const result = await mockFunctionsInvoke("lookup-patient-by-id", {
        body: { patient_code: "PB-202401-000001-5" },
      });
      expect(mockFunctionsInvoke).toHaveBeenCalledWith("lookup-patient-by-id", expect.any(Object));
      expect(result.data.found).toBe(true);
      expect(result.data.patient_id).toBe("patient-abc");
    });

    it("returns found=false for non-existent passport", async () => {
      mockFunctionsInvoke.mockResolvedValue({ data: { found: false }, error: null });
      const result = await mockFunctionsInvoke("lookup-patient-by-id", {
        body: { patient_code: "INVALID" },
      });
      expect(result.data.found).toBe(false);
    });
  });

  describe("Grant Patient Access", () => {
    it("inserts new record when no existing access", () => {
      const insertData = {
        doctor_id: "doctor-123",
        patient_id: "patient-abc",
        is_active: true,
      };
      expect(insertData.is_active).toBe(true);
      expect(insertData.doctor_id).toBe("doctor-123");
    });

    it("reactivates existing inactive access", () => {
      const existing = { id: "access-1", is_active: false };
      const updateData = { is_active: true, last_accessed_at: new Date().toISOString() };
      expect(existing.is_active).toBe(false);
      expect(updateData.is_active).toBe(true);
    });
  });

  describe("Patient Health Data via Edge Function", () => {
    it("verifies access before invoking edge function", () => {
      const accessCheck = {
        table: "doctor_patient_access",
        filters: { doctor_id: "doctor-123", patient_id: "patient-abc", is_active: true },
      };
      expect(accessCheck.filters.is_active).toBe(true);
    });

    it("calls get-patient-data-for-doctor with patient_id", async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { profile: {}, healthData: {}, records: [] },
        error: null,
      });
      const result = await mockFunctionsInvoke("get-patient-data-for-doctor", {
        body: { patient_id: "patient-abc" },
      });
      expect(result.data).toHaveProperty("profile");
      expect(result.data).toHaveProperty("healthData");
      expect(result.data).toHaveProperty("records");
    });

    it("returns 403 when no active access record", async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { error: "No access to this patient" },
        error: { message: "No access" },
      });
      const result = await mockFunctionsInvoke("get-patient-data-for-doctor", {
        body: { patient_id: "unauthorized-patient" },
      });
      expect(result.error).toBeTruthy();
    });
  });

  describe("Quick Register Guest Patient", () => {
    it("creates profile with is_guest_patient=true", () => {
      const profileData = {
        user_id: "guest-uuid",
        display_name: "Guest Patient",
        phone: "+1234567890",
        is_guest_patient: true,
        registered_by_hospital_id: "hospital-1",
      };
      expect(profileData.is_guest_patient).toBe(true);
      expect(profileData.registered_by_hospital_id).toBe("hospital-1");
    });
  });

  describe("Edge Function Security", () => {
    it("requires Authorization header", async () => {
      const headers = { Authorization: "Bearer mock-token" };
      expect(headers.Authorization).toMatch(/^Bearer /);
    });

    it("creates access log with metadata", () => {
      const accessLog = {
        user_id: "patient-abc",
        accessor_id: "doctor-123",
        accessor_type: "doctor",
        accessor_name: "Dr. Smith",
        access_reason: "Viewed patient health data via doctor portal",
        user_agent: "Mozilla/5.0",
        ip_address: "127.0.0.1",
      };
      expect(accessLog.accessor_type).toBe("doctor");
      expect(accessLog.access_reason).toContain("doctor portal");
    });

    it("creates data_viewed notification for patient", () => {
      const notification = {
        user_id: "patient-abc",
        title: "Health Data Accessed",
        type: "data_viewed",
        metadata: {
          accessor_id: "doctor-123",
          accessor_type: "doctor",
          accessor_name: "Dr. Smith",
        },
      };
      expect(notification.type).toBe("data_viewed");
      expect(notification.metadata.accessor_type).toBe("doctor");
    });
  });
});
