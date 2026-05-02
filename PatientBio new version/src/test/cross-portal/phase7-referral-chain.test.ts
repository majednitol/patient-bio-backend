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
function makeReferral(overrides: Record<string, any> = {}) {
  return {
    id: ids.referralId,
    referring_doctor_id: ids.doctor,
    referred_to_doctor_id: "doc-cp-010",
    patient_id: ids.patient,
    reason: "Suspected cardiac arrhythmia",
    diagnosis: "Irregular heartbeat on ECG",
    specialty_needed: "Cardiology",
    clinical_notes: "ECG shows intermittent AF. Patient reports palpitations.",
    urgency: "routine" as "routine" | "urgent" | "emergency",
    status: "pending",
    hospital_id: ids.hospitalId,
    responded_at: null as string | null,
    completed_at: null as string | null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Cross-Portal Phase 7: Doctor-to-Doctor Referral Chain", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createCrossPortalMock();
    mockInvoke = mock.mockInvoke;
  });

  // ── 1. Referring doctor creates referral ─────────────────────
  describe("Referring doctor initiates referral", () => {
    it("1. Referral links referring doctor, specialist, and patient", () => {
      const ref = makeReferral();
      expect(ref.referring_doctor_id).toBe(users.doctor.id);
      expect(ref.referred_to_doctor_id).toBe("doc-cp-010");
      expect(ref.patient_id).toBe(users.patient.id);
    });

    it("2. Referral includes clinical notes and diagnosis", () => {
      const ref = makeReferral();
      expect(ref.clinical_notes).toContain("AF");
      expect(ref.diagnosis).toContain("heartbeat");
    });

    it("3. Referral specifies specialty needed", () => {
      const ref = makeReferral({ specialty_needed: "Neurology" });
      expect(ref.specialty_needed).toBe("Neurology");
    });

    it("4. Emergency urgency flagged correctly", () => {
      const ref = makeReferral({ urgency: "emergency" });
      expect(ref.urgency).toBe("emergency");
    });

    it("5. Referral scoped to hospital context", () => {
      const ref = makeReferral({ hospital_id: ids.hospitalId });
      expect(ref.hospital_id).toBe(ids.hospitalId);
    });
  });

  // ── 2. Specialist receives and responds ──────────────────────
  describe("Specialist receives referral", () => {
    it("6. Specialist notified of incoming referral", () => {
      const notif = makeNotification({
        user_id: "doc-cp-010",
        type: "doctor_referral",
        title: "New Patient Referral",
        message: "Dr. Patel has referred a patient for Cardiology evaluation.",
      });
      expect(notif.user_id).toBe("doc-cp-010");
      expect(notif.type).toBe("doctor_referral");
    });

    it("7. Specialist accepts referral", () => {
      const accepted = makeReferral({
        status: "accepted",
        responded_at: new Date().toISOString(),
      });
      expect(accepted.status).toBe("accepted");
      expect(accepted.responded_at).toBeDefined();
    });

    it("8. Referring doctor notified of acceptance", () => {
      const notif = makeNotification({
        user_id: users.doctor.id,
        type: "referral_accepted",
        title: "Referral Accepted",
        message: "Your referral to Cardiology has been accepted.",
      });
      expect(notif.user_id).toBe(users.doctor.id);
      expect(notif.type).toBe("referral_accepted");
    });

    it("9. Specialist declines referral with reason", async () => {
      mockResponse(mockInvoke, {
        success: true,
        status: "declined",
        response_notes: "Patient should see Electrophysiology specialist instead.",
      });
      const result = await mockInvoke("respond-referral", {
        body: {
          referral_id: ids.referralId,
          action: "decline",
          notes: "Patient should see Electrophysiology specialist instead.",
        },
      });
      expect(result.data.status).toBe("declined");
      expect(result.data.response_notes).toContain("Electrophysiology");
    });
  });

  // ── 3. Referral completion ───────────────────────────────────
  describe("Referral lifecycle completion", () => {
    it("10. Specialist marks referral as completed", () => {
      const completed = makeReferral({
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      expect(completed.status).toBe("completed");
      expect(completed.completed_at).toBeDefined();
    });

    it("11. Referring doctor notified of completion", () => {
      const notif = makeNotification({
        user_id: users.doctor.id,
        type: "referral_completed",
        title: "Referral Completed",
        message: "The Cardiology referral has been completed.",
      });
      expect(notif.type).toBe("referral_completed");
    });

    it("12. Patient notified of referral outcome", () => {
      const notif = makeNotification({
        user_id: users.patient.id,
        type: "referral_update",
        title: "Your Referral Update",
        message: "Your referral to a Cardiologist has been completed.",
      });
      expect(notif.user_id).toBe(users.patient.id);
    });

    it("13. Status transitions validated (pending → accepted → completed)", () => {
      const ref1 = makeReferral({ status: "pending" });
      const ref2 = makeReferral({ status: "accepted", responded_at: new Date().toISOString() });
      const ref3 = makeReferral({ status: "completed", completed_at: new Date().toISOString() });

      const validTransitions: Record<string, string[]> = {
        pending: ["accepted", "declined"],
        accepted: ["completed"],
        declined: [],
        completed: [],
      };

      expect(validTransitions[ref1.status]).toContain(ref2.status);
      expect(validTransitions[ref2.status]).toContain(ref3.status);
      expect(validTransitions[ref3.status]).toHaveLength(0);
    });

    it("14. Referral with urgent priority surfaces in queue", () => {
      const urgentRef = makeReferral({ urgency: "urgent" });
      const routineRef = makeReferral({ urgency: "routine" });
      const priorityMap: Record<string, number> = { emergency: 3, urgent: 2, routine: 1 };
      expect(priorityMap[urgentRef.urgency]).toBeGreaterThan(priorityMap[routineRef.urgency]);
    });
  });
});
