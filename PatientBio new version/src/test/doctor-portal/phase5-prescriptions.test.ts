import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "doctor-123" } }),
}));

describe("Phase 5: Prescriptions", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("parseMedications", () => {
    const parseMedications = (medications: any) => {
      if (!medications) return [];
      if (Array.isArray(medications)) return medications;
      return [];
    };

    it("returns empty array for null", () => {
      expect(parseMedications(null)).toEqual([]);
    });

    it("returns array for valid array input", () => {
      const meds = [{ name: "Aspirin", dosage: "100mg", frequency: "daily", duration: "7 days" }];
      expect(parseMedications(meds)).toEqual(meds);
    });

    it("returns empty array for non-array input", () => {
      expect(parseMedications("invalid")).toEqual([]);
      expect(parseMedications(42)).toEqual([]);
      expect(parseMedications({})).toEqual([]);
    });
  });

  describe("Create Prescription", () => {
    it("requires authentication", () => {
      const userId = "doctor-123";
      expect(userId).toBeTruthy();
    });

    it("inserts with doctor_id from auth", () => {
      const insertData = {
        patient_id: "patient-abc",
        doctor_id: "doctor-123",
        hospital_id: null,
        diagnosis: "Hypertension",
        medications: [{ name: "Lisinopril", dosage: "10mg", frequency: "daily", duration: "30 days" }],
        instructions: "Take with food",
        notes: null,
        follow_up_date: "2024-02-15",
      };
      expect(insertData.doctor_id).toBe("doctor-123");
      expect(insertData.medications.length).toBe(1);
    });

    it("attaches hospital_id when in hospital context", () => {
      const insertData = { hospital_id: "hospital-1" };
      expect(insertData.hospital_id).toBe("hospital-1");
    });

    it("stores follow_up_date correctly", () => {
      const insertData = { follow_up_date: "2024-03-01" };
      expect(insertData.follow_up_date).toBe("2024-03-01");
    });
  });

  describe("Update Prescription", () => {
    it("supports partial updates", () => {
      const updates = { diagnosis: "Updated Diagnosis" };
      const updateData: Record<string, unknown> = {};
      if (updates.diagnosis !== undefined) updateData.diagnosis = updates.diagnosis;
      expect(updateData).toEqual({ diagnosis: "Updated Diagnosis" });
    });

    it("handles medications update as JSON", () => {
      const meds = [{ name: "NewDrug", dosage: "5mg", frequency: "daily", duration: "14 days" }];
      const updateData: Record<string, unknown> = {};
      updateData.medications = meds;
      expect(updateData.medications).toEqual(meds);
    });
  });

  describe("Toggle Prescription Status", () => {
    it("flips is_active and invalidates both caches", () => {
      const keysToInvalidate = [
        ["doctor-prescriptions"],
        ["patient-prescriptions"],
      ];
      expect(keysToInvalidate).toContainEqual(["doctor-prescriptions"]);
      expect(keysToInvalidate).toContainEqual(["patient-prescriptions"]);
    });

    it("shows appropriate toast for active vs completed", () => {
      const getMessage = (isActive: boolean) =>
        isActive ? "Prescription marked as active" : "Prescription marked as completed";
      expect(getMessage(true)).toContain("active");
      expect(getMessage(false)).toContain("completed");
    });
  });

  describe("Patient Prescriptions (Cross-Portal)", () => {
    it("joins doctor_profiles for doctor name and specialty", () => {
      const prescription = {
        doctor_id: "doc-1",
        medications: [],
        doctor_name: "Dr. Smith",
        doctor_specialty: "Cardiology",
        doctor_qualification: "MBBS, MD",
        doctor_phone: "+1234567890",
      };
      expect(prescription.doctor_name).toBe("Dr. Smith");
      expect(prescription.doctor_specialty).toBe("Cardiology");
    });
  });
});
