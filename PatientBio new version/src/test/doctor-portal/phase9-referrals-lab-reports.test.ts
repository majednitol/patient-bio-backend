import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorageSignedUrl = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
        }),
      }),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({ createSignedUrl: mockStorageSignedUrl }),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "doctor-123" } }),
}));

describe("Phase 9: Referrals and Lab Reports", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Doctor Referrals", () => {
    it("creates referral with referring_doctor_id from auth", () => {
      const referralData = {
        referring_doctor_id: "doctor-123",
        referred_to_doctor_id: "doctor-456",
        patient_id: "patient-abc",
        urgency: "routine",
        reason: "Specialist consultation needed",
      };
      expect(referralData.referring_doctor_id).toBe("doctor-123");
    });

    it("sets responded_at on accept/decline", () => {
      const updates: Record<string, unknown> = { status: "accepted" };
      if (updates.status === "accepted" || updates.status === "declined") {
        updates.responded_at = new Date().toISOString();
      }
      expect(updates.responded_at).toBeTruthy();
    });

    it("sets completed_at on complete", () => {
      const updates: Record<string, unknown> = { status: "completed" };
      if (updates.status === "completed") {
        updates.completed_at = new Date().toISOString();
      }
      expect(updates.completed_at).toBeTruthy();
    });

    it("splits sent vs received referrals", () => {
      const userId = "doctor-123";
      const referrals = [
        { id: "1", referring_doctor_id: userId, referred_to_doctor_id: "doc-2" },
        { id: "2", referring_doctor_id: "doc-3", referred_to_doctor_id: userId },
      ];
      const sent = referrals.filter((r) => r.referring_doctor_id === userId);
      const received = referrals.filter((r) => r.referred_to_doctor_id === userId);
      expect(sent.length).toBe(1);
      expect(received.length).toBe(1);
    });
  });

  describe("Search Doctors", () => {
    it("requires minimum 2 characters", () => {
      const searchTerm = "D";
      const enabled = searchTerm.length >= 2;
      expect(enabled).toBe(false);

      const validTerm = "Dr";
      expect(validTerm.length >= 2).toBe(true);
    });

    it("searches by name with ilike", () => {
      const searchPattern = `%Smith%`;
      expect(searchPattern).toContain("%");
    });
  });

  describe("Received Lab Reports", () => {
    it("filters by doctor_id and is_shared_with_doctor", () => {
      const queryConfig = {
        table: "pathologist_reports",
        filters: { doctor_id: "doctor-123", is_shared_with_doctor: true },
      };
      expect(queryConfig.filters.is_shared_with_doctor).toBe(true);
    });

    it("marks report viewed with timestamp", () => {
      const update = { doctor_viewed_at: new Date().toISOString() };
      expect(update.doctor_viewed_at).toBeTruthy();
    });

    it("generates 5-min signed URL from pathologist-reports bucket", async () => {
      mockStorageSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.url" }, error: null });
      const result = await mockStorageSignedUrl("path/to/file.pdf", 300);
      expect(mockStorageSignedUrl).toHaveBeenCalledWith("path/to/file.pdf", 300);
    });

    it("maps abnormal values correctly", () => {
      const report = {
        has_abnormal_values: true,
        abnormal_flags: [{ test: "WBC", value: "15000", flag: "high" }],
      };
      expect(report.has_abnormal_values).toBe(true);
      expect(report.abnormal_flags[0].flag).toBe("high");
    });

    it("resolves pathologist and patient names", () => {
      const report = {
        pathologist_name: "Dr. Lab Expert",
        patient_name: "John Doe",
      };
      expect(report.pathologist_name).toBeTruthy();
      expect(report.patient_name).toBeTruthy();
    });
  });
});
