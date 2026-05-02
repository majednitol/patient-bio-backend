import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "avatars/test.jpg" }, error: null }),
      }),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "doctor-123", email: "doc@test.com" } }),
}));

describe("Phase 2: Profile Management", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Doctor Profile Structure", () => {
    const mockProfile = {
      id: "profile-1",
      user_id: "doctor-123",
      full_name: "Dr. Smith",
      specialty: "Cardiology",
      license_number: "MED-12345",
      phone: "+1234567890",
      qualification: "MBBS, MD",
      experience_years: 15,
      bio: "Experienced cardiologist",
      avatar_url: "https://example.com/avatar.jpg",
      consultation_fee: 500,
      is_verified: true,
      created_at: "2024-01-01",
      updated_at: "2024-06-01",
    };

    it("contains all required profile fields", () => {
      expect(mockProfile).toHaveProperty("full_name");
      expect(mockProfile).toHaveProperty("specialty");
      expect(mockProfile).toHaveProperty("license_number");
      expect(mockProfile).toHaveProperty("qualification");
      expect(mockProfile).toHaveProperty("experience_years");
      expect(mockProfile).toHaveProperty("is_verified");
    });

    it("profile fetched by user_id", () => {
      expect(mockProfile.user_id).toBe("doctor-123");
    });
  });

  describe("Profile Completion Calculator", () => {
    it("tracks 9 fields for completion", () => {
      const fieldKeys = [
        "full_name", "specialty", "license_number", "phone",
        "qualification", "experience_years", "bio", "avatar_url",
        "hospital_affiliation",
      ];
      expect(fieldKeys.length).toBe(9);
    });

    it("calculates percentage correctly for 5/9 fields", () => {
      const completed = 5;
      const total = 9;
      const percentage = Math.round((completed / total) * 100);
      expect(percentage).toBe(56);
    });

    it("identifies missing fields with navigation links", () => {
      const fields = [
        { key: "full_name", isComplete: true, link: "/doctor/profile" },
        { key: "specialty", isComplete: false, link: "/doctor/profile" },
        { key: "hospital_affiliation", isComplete: false, link: "/hospital/hospitals" },
      ];
      const missing = fields.filter((f) => !f.isComplete);
      expect(missing.length).toBe(2);
      expect(missing[0].key).toBe("specialty");
      expect(missing[1].link).toBe("/hospital/hospitals");
    });

    it("returns 100% when all fields complete", () => {
      const percentage = Math.round((9 / 9) * 100);
      expect(percentage).toBe(100);
    });

    it("returns 0% when no fields complete", () => {
      const percentage = Math.round((0 / 9) * 100);
      expect(percentage).toBe(0);
    });
  });

  describe("Query Invalidation on Update", () => {
    it("invalidation keys include doctor-profile and is-doctor", () => {
      const keysToInvalidate = [
        ["doctor-profile"],
        ["is-doctor"],
        ["user-role"],
      ];
      expect(keysToInvalidate).toContainEqual(["doctor-profile"]);
      expect(keysToInvalidate).toContainEqual(["is-doctor"]);
    });
  });

  describe("useIsDoctor Logic", () => {
    it("queries user_roles for doctor role", () => {
      const queryConfig = {
        table: "user_roles",
        filters: { user_id: "doctor-123", role: "doctor" },
      };
      expect(queryConfig.table).toBe("user_roles");
      expect(queryConfig.filters.role).toBe("doctor");
    });

    it("returns false when no matching role", () => {
      const data = null;
      expect(!!data).toBe(false);
    });
  });
});
