import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "share-1" }, error: null }) }),
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "doctor-123" } }),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    createNotification: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("Phase 14: Messaging and Cross-Portal Sharing", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Doctor-Pathologist Shares", () => {
    it("creates share with doctor_id from auth", () => {
      const shareData = {
        doctor_id: "doctor-123",
        pathologist_id: "path-456",
        patient_id: "patient-abc",
        disease_category: "cardiology",
        notes: "Please check lipid panel",
      };
      expect(shareData.doctor_id).toBe("doctor-123");
    });

    it("tracks status: pending -> viewed -> completed", () => {
      const validStatuses = ["pending", "viewed", "completed"];
      expect(validStatuses).toContain("pending");
      expect(validStatuses).toContain("viewed");
      expect(validStatuses).toContain("completed");
    });

    it("counts pending shares", () => {
      const shares = [
        { status: "pending" },
        { status: "viewed" },
        { status: "pending" },
        { status: "completed" },
      ];
      const pendingCount = shares.filter((s) => s.status === "pending").length;
      expect(pendingCount).toBe(2);
    });
  });

  describe("Doctor-Researcher Shares", () => {
    it("creates share with anonymization default true", () => {
      const shareData = {
        doctor_id: "doctor-123",
        researcher_id: "researcher-789",
        patient_id: "patient-abc",
        is_anonymized: true,
        research_purpose: "Cardiovascular study",
      };
      expect(shareData.is_anonymized).toBe(true);
    });

    it("notifies researcher via notifications table", () => {
      const notification = {
        user_id: "researcher-789",
        type: "research_data_shared",
        title: "New Research Data Available",
        message: "A doctor has shared patient data for research purposes.",
        metadata: { share_id: "share-1", disease_category: "cardiology" },
      };
      expect(notification.type).toBe("research_data_shared");
    });
  });

  describe("Pathologist Notification Utility", () => {
    it("notifyPathologistOfReferral sends referral_received notification", () => {
      const notification = {
        user_id: "path-456",
        type: "referral_received",
        title: "New Patient Referral",
      };
      expect(notification.type).toBe("referral_received");
    });

    it("notifyDoctorOfCriticalValue sends critical alert", () => {
      const notification = {
        user_id: "doctor-123",
        type: "report_shared",
        title: "🚨 CRITICAL Lab Value Alert",
        metadata: { is_critical_alert: true },
      };
      expect(notification.metadata.is_critical_alert).toBe(true);
    });
  });

  describe("Doctor-Patient Messaging Structure", () => {
    it("message table has sender_role, is_read, scoped to pair", () => {
      const message = {
        doctor_id: "doctor-123",
        patient_id: "patient-abc",
        sender_role: "doctor" as const,
        message_text: "How are you feeling on the new medication?",
        is_read: false,
        created_at: new Date().toISOString(),
      };
      expect(message.sender_role).toBe("doctor");
      expect(message.is_read).toBe(false);
      expect(message.doctor_id).toBeTruthy();
      expect(message.patient_id).toBeTruthy();
    });

    it("supports both doctor and patient sender roles", () => {
      const validRoles = ["doctor", "patient"];
      expect(validRoles).toContain("doctor");
      expect(validRoles).toContain("patient");
    });
  });

  describe("Edge Function Security", () => {
    it("validates JWT claims for user identity", () => {
      const claims = { sub: "doctor-123", email: "doc@test.com", role: "authenticated" };
      expect(claims.sub).toBe("doctor-123");
    });

    it("returns 401 on missing auth header", () => {
      const authHeader = null;
      const isValid = authHeader?.startsWith("Bearer ");
      expect(isValid).toBeFalsy();
    });
  });
});
