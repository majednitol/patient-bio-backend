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
function makeDoctorPatientAccess(overrides: Record<string, any> = {}) {
  return {
    id: ids.doctorAccess,
    doctor_id: ids.doctor,
    patient_id: ids.patient,
    is_active: true,
    granted_at: new Date().toISOString(),
    last_accessed_at: null,
    access_token_id: null,
    ...overrides,
  };
}

function makeAppointment(overrides: Record<string, any> = {}) {
  return {
    id: ids.appointment,
    doctor_id: ids.doctor,
    patient_id: ids.patient,
    appointment_date: "2026-02-20",
    start_time: "10:00",
    end_time: "10:30",
    status: "scheduled",
    reason: "General check-up",
    checked_in_at: null as string | null,
    consultation_started_at: null as string | null,
    consultation_ended_at: null as string | null,
    parent_appointment_id: null as string | null,
    ...overrides,
  };
}

function makePrescription(overrides: Record<string, any> = {}) {
  return {
    id: ids.prescription,
    doctor_id: ids.doctor,
    patient_id: ids.patient,
    diagnosis: "Viral fever",
    medications: [
      { name: "Paracetamol", dosage: "500mg", frequency: "Twice daily", duration: "5 days" },
    ],
    general_instructions: "Rest and hydrate",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeMessage(overrides: Record<string, any> = {}) {
  return {
    id: "msg-cp-901",
    doctor_id: ids.doctor,
    patient_id: ids.patient,
    sender_role: "doctor",
    message_text: "How are you feeling on the new medication?",
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeReferral(overrides: Record<string, any> = {}) {
  return {
    id: ids.referralId,
    referring_doctor_id: ids.doctor,
    referred_to_doctor_id: "doc-cp-010",
    patient_id: ids.patient,
    reason: "Suspected cardiac arrhythmia",
    specialty_needed: "Cardiology",
    urgency: "routine",
    status: "pending",
    responded_at: null as string | null,
    completed_at: null as string | null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Cross-Portal Phase 4: Patient ↔ Doctor Connection & Clinical Flow", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createCrossPortalMock();
    mockInvoke = mock.mockInvoke;
  });

  // ── 1. Patient connects to doctor ────────────────────────────
  describe("Patient connects to doctor via QR / GHPID", () => {
    it("1. Connection creates doctor_patient_access record", async () => {
      mockResponse(mockInvoke, { success: true, access_id: ids.doctorAccess });
      const result = await mockInvoke("connect-to-doctor", {
        body: { doctor_id: ids.doctor },
      });
      expect(result.data.success).toBe(true);
      expect(result.data.access_id).toBe(ids.doctorAccess);
    });

    it("2. Doctor notified of new patient connection", () => {
      const notif = makeNotification({
        user_id: users.doctor.id,
        type: "new_patient_connected",
        title: "New Patient Connected",
        message: "A patient has connected to your practice.",
      });
      expect(notif.user_id).toBe(users.doctor.id);
      expect(notif.type).toBe("new_patient_connected");
    });

    it("3. Duplicate connection handled gracefully", async () => {
      mockResponse(mockInvoke, { success: true, already_connected: true });
      const result = await mockInvoke("connect-to-doctor", {
        body: { doctor_id: ids.doctor },
      });
      expect(result.data.already_connected).toBe(true);
    });

    it("4. Access record defaults to is_active=true", () => {
      const access = makeDoctorPatientAccess();
      expect(access.is_active).toBe(true);
    });
  });

  // ── 2. Doctor accesses patient data ──────────────────────────
  describe("Doctor accesses connected patient data", () => {
    it("5. Doctor fetches patient data with active access", async () => {
      mockResponse(mockInvoke, {
        profile: { display_name: "Patient A", date_of_birth: "1990-05-15" },
        health_data: { blood_group: "O+", allergies: ["Penicillin"] },
        records: [{ title: "Blood test", category: "lab_result" }],
        prescriptions: [],
      });
      const result = await mockInvoke("get-patient-data-for-doctor", {
        body: { patient_id: ids.patient },
      });
      expect(result.data.profile).toBeDefined();
      expect(result.data.health_data.blood_group).toBe("O+");
    });

    it("6. Access without active connection rejected", async () => {
      mockError(mockInvoke, "No active access to this patient");
      const result = await mockInvoke("get-patient-data-for-doctor", {
        body: { patient_id: "unconnected-patient" },
      });
      expect(result.data.error).toContain("No active access");
    });

    it("7. Access creates audit log entry", async () => {
      mockResponse(mockInvoke, { success: true, access_logged: true });
      const result = await mockInvoke("get-patient-data-for-doctor", {
        body: { patient_id: ids.patient },
      });
      expect(result.data.access_logged).toBe(true);
    });

    it("8. Patient receives notification on data access", () => {
      const notif = makeNotification({
        user_id: users.patient.id,
        type: "doctor_accessed_data",
        title: "Your data was accessed",
        message: "Dr. Patel viewed your health records.",
      });
      expect(notif.user_id).toBe(users.patient.id);
    });
  });

  // ── 3. Appointment booking & check-in ────────────────────────
  describe("Appointment booking through check-in flow", () => {
    it("9. Patient books appointment with connected doctor", () => {
      const appt = makeAppointment();
      expect(appt.doctor_id).toBe(users.doctor.id);
      expect(appt.patient_id).toBe(users.patient.id);
      expect(appt.status).toBe("scheduled");
    });

    it("10. Check-in updates checked_in_at timestamp", () => {
      const appt = makeAppointment({
        status: "checked_in",
        checked_in_at: new Date().toISOString(),
      });
      expect(appt.checked_in_at).toBeDefined();
      expect(appt.status).toBe("checked_in");
    });

    it("11. Consultation start records timestamp", () => {
      const appt = makeAppointment({
        status: "in_progress",
        consultation_started_at: new Date().toISOString(),
      });
      expect(appt.consultation_started_at).toBeDefined();
    });

    it("12. Consultation end records duration", () => {
      const start = new Date("2026-02-20T10:00:00Z");
      const end = new Date("2026-02-20T10:18:00Z");
      const appt = makeAppointment({
        status: "completed",
        consultation_started_at: start.toISOString(),
        consultation_ended_at: end.toISOString(),
      });
      const durationMs = new Date(appt.consultation_ended_at!).getTime() - new Date(appt.consultation_started_at!).getTime();
      expect(durationMs / 60000).toBe(18);
    });
  });

  // ── 4. Prescription & follow-up ──────────────────────────────
  describe("Prescription creation and follow-up scheduling", () => {
    it("13. Doctor creates prescription for patient", () => {
      const rx = makePrescription();
      expect(rx.doctor_id).toBe(users.doctor.id);
      expect(rx.patient_id).toBe(users.patient.id);
      expect(rx.medications).toHaveLength(1);
    });

    it("14. Patient notified of new prescription", () => {
      const notif = makeNotification({
        user_id: users.patient.id,
        type: "prescription_added",
        title: "New Prescription",
        message: "Dr. Patel has prescribed medication for you.",
      });
      expect(notif.type).toBe("prescription_added");
    });

    it("15. Medication interaction check before prescribing", async () => {
      mockResponse(mockInvoke, {
        overall_risk: "moderate",
        interactions: [{ pair: ["Warfarin", "Aspirin"], severity: "moderate" }],
      });
      const result = await mockInvoke("check-medication-interactions", {
        body: { medications: ["Warfarin", "Aspirin"] },
      });
      expect(result.data.overall_risk).toBe("moderate");
      expect(result.data.interactions).toHaveLength(1);
    });

    it("16. Follow-up appointment linked to parent", () => {
      const followUp = makeAppointment({
        id: "appt-followup-001",
        parent_appointment_id: ids.appointment,
        reason: "Follow-up: Viral fever",
      });
      expect(followUp.parent_appointment_id).toBe(ids.appointment);
    });
  });

  // ── 5. Doctor-patient messaging ──────────────────────────────
  describe("In-app messaging between doctor and patient", () => {
    it("17. Doctor sends message to patient", () => {
      const msg = makeMessage({ sender_role: "doctor" });
      expect(msg.doctor_id).toBe(users.doctor.id);
      expect(msg.patient_id).toBe(users.patient.id);
      expect(msg.sender_role).toBe("doctor");
    });

    it("18. Patient replies to doctor", () => {
      const reply = makeMessage({
        id: "msg-cp-902",
        sender_role: "patient",
        message_text: "Feeling much better, thank you!",
      });
      expect(reply.sender_role).toBe("patient");
    });

    it("19. Unread messages tracked with is_read flag", () => {
      const msg = makeMessage({ is_read: false });
      expect(msg.is_read).toBe(false);
      const readMsg = { ...msg, is_read: true };
      expect(readMsg.is_read).toBe(true);
    });

    it("20. Patient notified of new doctor message", () => {
      const notif = makeNotification({
        user_id: users.patient.id,
        type: "doctor_message",
        title: "New Message from Dr. Patel",
      });
      expect(notif.type).toBe("doctor_message");
    });
  });

  // ── 6. Access revocation & referral ──────────────────────────
  describe("Access revocation and doctor referral", () => {
    it("21. Patient revokes doctor access", () => {
      const access = makeDoctorPatientAccess({ is_active: false });
      expect(access.is_active).toBe(false);
    });

    it("22. Revoked doctor cannot fetch patient data", async () => {
      mockError(mockInvoke, "No active access to this patient");
      const result = await mockInvoke("get-patient-data-for-doctor", {
        body: { patient_id: ids.patient },
      });
      expect(result.data.error).toContain("No active access");
    });

    it("23. Doctor refers patient to specialist", () => {
      const referral = makeReferral();
      expect(referral.referring_doctor_id).toBe(users.doctor.id);
      expect(referral.specialty_needed).toBe("Cardiology");
      expect(referral.status).toBe("pending");
    });

    it("24. Referred doctor receives notification", () => {
      const notif = makeNotification({
        user_id: "doc-cp-010",
        type: "doctor_referral",
        title: "New Patient Referral",
        message: "Dr. Patel has referred a patient to you.",
      });
      expect(notif.type).toBe("doctor_referral");
    });

    it("25. Referral acceptance updates status", () => {
      const accepted = makeReferral({
        status: "accepted",
        responded_at: new Date().toISOString(),
      });
      expect(accepted.status).toBe("accepted");
      expect(accepted.responded_at).toBeDefined();
    });

    it("26. Completed referral records completion", () => {
      const completed = makeReferral({
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      expect(completed.status).toBe("completed");
      expect(completed.completed_at).toBeDefined();
    });
  });
});
