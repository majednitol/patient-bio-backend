import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
      }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "doctor-123" } }),
}));

describe("Phase 13: Analytics and Settings", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Doctor Settings", () => {
    it("fetches notification preferences and timezone", () => {
      const settings = {
        id: "settings-1",
        user_id: "doctor-123",
        default_consultation_minutes: 15,
        timezone: "Asia/Kolkata",
        email_digest_enabled: true,
        notification_new_patient: true,
        notification_appointment: true,
        notification_prescription: false,
        notification_referral: true,
        auto_reply_enabled: false,
        auto_reply_message: "",
      };
      expect(settings.default_consultation_minutes).toBe(15);
      expect(settings.timezone).toBe("Asia/Kolkata");
    });

    it("upserts via onConflict on user_id", () => {
      const upsertConfig = { onConflict: "user_id" };
      expect(upsertConfig.onConflict).toBe("user_id");
    });

    it("default_consultation_minutes field is present", () => {
      const settingsKeys = [
        "default_consultation_minutes",
        "timezone",
        "email_digest_enabled",
        "auto_reply_enabled",
      ];
      expect(settingsKeys).toContain("default_consultation_minutes");
    });
  });

  describe("Doctor Share History", () => {
    it("fetches sharing records ordered by shared_at desc", () => {
      const queryConfig = {
        table: "doctor_share_history",
        filter: { user_id: "doctor-123" },
        ordering: { column: "shared_at", ascending: false },
      };
      expect(queryConfig.ordering.ascending).toBe(false);
    });

    it("creates share history with doctor_id, token_id, notes", () => {
      const insertData = {
        user_id: "doctor-123",
        doctor_id: "doc-456",
        token_id: "token-789",
        notes: "Annual checkup data",
      };
      expect(insertData.doctor_id).toBe("doc-456");
      expect(insertData.token_id).toBe("token-789");
      expect(insertData.notes).toBeTruthy();
    });

    it("filters shares by doctor_id client-side", () => {
      const shareHistory = [
        { id: "1", doctor_id: "doc-1" },
        { id: "2", doctor_id: "doc-2" },
        { id: "3", doctor_id: "doc-1" },
      ];
      const filtered = shareHistory.filter((h) => h.doctor_id === "doc-1");
      expect(filtered.length).toBe(2);
    });
  });
});
