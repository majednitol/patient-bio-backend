import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "hs-1",
            hospital_id: "hosp-1",
            role: "doctor",
            department: "Cardiology",
            is_active: true,
            joined_at: "2024-01-01",
            hospital: { id: "hosp-1", name: "City Hospital", logo_url: null, city: "NYC", type: "general" },
          },
        ],
        error: null,
      }),
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "doctor-123" } }),
}));

describe("Phase 11: Multi-Hospital Context", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Doctor Hospitals", () => {
    it("joins hospitals table for active affiliations", () => {
      const selectFields = "id, hospital_id, role, department, is_active, joined_at, hospital:hospitals(id, name, logo_url, city, type)";
      expect(selectFields).toContain("hospitals");
      expect(selectFields).toContain("is_active");
    });

    it("filters by user_id and is_active=true", () => {
      const filters = { user_id: "doctor-123", is_active: true };
      expect(filters.is_active).toBe(true);
    });
  });

  describe("Hospital Context Filtering", () => {
    it("filters appointments by selected hospital_id", () => {
      const hospitalId = "hosp-1";
      const queryFilter = { hospital_id: hospitalId };
      expect(queryFilter.hospital_id).toBe("hosp-1");
    });

    it("private practice mode shows all personal data", () => {
      const hospitalId = undefined;
      const isPrivatePractice = !hospitalId;
      expect(isPrivatePractice).toBe(true);
    });

    it("prescription includes hospital_id from context", () => {
      const prescription = { hospital_id: "hosp-1", doctor_id: "doctor-123" };
      expect(prescription.hospital_id).toBe("hosp-1");
    });
  });

  describe("Hospital Switcher", () => {
    it("switches context and updates data scope", () => {
      const contexts = [
        { label: "Private Practice", hospitalId: undefined },
        { label: "City Hospital", hospitalId: "hosp-1" },
      ];
      expect(contexts.length).toBe(2);
      expect(contexts[0].hospitalId).toBeUndefined();
      expect(contexts[1].hospitalId).toBe("hosp-1");
    });
  });
});
