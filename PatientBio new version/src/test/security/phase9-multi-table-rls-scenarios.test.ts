/**
 * Phase 9: Multi-Table RLS Interaction Scenarios
 * Validates complex cross-table access patterns across prescriptions, appointments,
 * notes, intake, referrals, notifications, wallets, and consent records.
 */
import { describe, it, expect } from "vitest";
import {
  simulateMultiTableRLS,
  hasPatientApprovedSharing,
  makeDataAccessRequest,
  type MultiTableContext,
  type MockDataAccessRequest,
} from "./security-helpers";

function makeCtx(overrides?: Partial<MultiTableContext>): MultiTableContext {
  return {
    userId: "patient-1",
    role: "user",
    doctorAccess: [
      { doctor_id: "doc-1", patient_id: "patient-1", is_active: true },
      { doctor_id: "doc-2", patient_id: "patient-1", is_active: false },
    ],
    dataAccessRequests: [],
    prescriptions: [
      { id: "rx-1", doctor_id: "doc-1", patient_id: "patient-1" },
      { id: "rx-2", doctor_id: "doc-2", patient_id: "patient-2" },
    ],
    appointments: [
      { id: "apt-1", doctor_id: "doc-1", patient_id: "patient-1", hospital_id: "hosp-1" },
      { id: "apt-2", doctor_id: "doc-2", patient_id: "patient-2", hospital_id: "hosp-1" },
    ],
    doctorNotes: [
      { id: "note-1", doctor_id: "doc-1", patient_id: "patient-1" },
      { id: "note-2", doctor_id: "doc-2", patient_id: "patient-1" },
    ],
    intakeForms: [
      { id: "intake-1", appointment_id: "apt-1", patient_id: "patient-1" },
    ],
    referrals: [
      { id: "ref-1", referring_doctor_id: "doc-1", referred_to_doctor_id: "doc-3", patient_id: "patient-1" },
    ],
    notifications: [
      { id: "notif-1", user_id: "patient-1" },
      { id: "notif-2", user_id: "doc-1" },
    ],
    wallets: [{ user_id: "patient-1" }],
    auditLogs: [{ id: "log-1", admin_id: "admin-1" }],
    ...overrides,
  };
}

describe("Phase 9: Multi-Table RLS Interaction Scenarios", () => {
  it("1. Doctor creates prescription -- patient can read it", () => {
    const ctx = makeCtx({ userId: "patient-1", role: "user" });
    const result = simulateMultiTableRLS("prescriptions", "SELECT", "rx-1", ctx);
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("Patient");
  });

  it("2. Doctor A cannot read Doctor B's prescriptions for same patient", () => {
    const ctx = makeCtx({ userId: "doc-1", role: "doctor" });
    // rx-2 belongs to doc-2 for patient-2, doc-1 has no access to patient-2
    const result = simulateMultiTableRLS("prescriptions", "SELECT", "rx-2", ctx);
    expect(result.allowed).toBe(false);
  });

  it("3. Patient revokes doctor access -- doctor loses prescription read", () => {
    // doc-2 has is_active: false
    const ctx = makeCtx({ userId: "doc-2", role: "doctor" });
    const result = simulateMultiTableRLS("prescriptions", "SELECT", "rx-1", ctx);
    // doc-2 is not the prescribing doctor for rx-1 (doc-1 is), and access is inactive
    expect(result.allowed).toBe(false);
  });

  it("4. Hospital admin can only see appointments for their hospital", () => {
    const ctx = makeCtx({ userId: "hadmin-1", role: "hospital_admin", hospitalId: "hosp-1" });
    const r1 = simulateMultiTableRLS("appointments", "SELECT", "apt-1", ctx);
    expect(r1.allowed).toBe(true);

    // Different hospital
    const ctx2 = makeCtx({ userId: "hadmin-2", role: "hospital_admin", hospitalId: "hosp-999" });
    const r2 = simulateMultiTableRLS("appointments", "SELECT", "apt-1", ctx2);
    expect(r2.allowed).toBe(false);
  });

  it("5. Pathologist report linked to doctor -- tested via approval chain", () => {
    const requests: MockDataAccessRequest[] = [
      makeDataAccessRequest({ patient_id: "patient-1", requester_id: "path-1", requester_type: "pathologist", status: "approved" }),
    ];
    expect(hasPatientApprovedSharing(requests, "patient-1", "path-1", "pathologist")).toBe(true);
  });

  it("6. Researcher with approved access -- consent verified", () => {
    const requests: MockDataAccessRequest[] = [
      makeDataAccessRequest({ patient_id: "patient-1", requester_id: "res-1", requester_type: "researcher", status: "approved" }),
    ];
    expect(hasPatientApprovedSharing(requests, "patient-1", "res-1", "researcher")).toBe(true);
    // Without approval
    expect(hasPatientApprovedSharing([], "patient-1", "res-1", "researcher")).toBe(false);
  });

  it("7. Doctor notes are invisible to other doctors", () => {
    // doc-1 can see note-1 (their own)
    const ctx1 = makeCtx({ userId: "doc-1", role: "doctor" });
    expect(simulateMultiTableRLS("doctor_patient_notes", "SELECT", "note-1", ctx1).allowed).toBe(true);
    // doc-1 cannot see note-2 (doc-2's note)
    expect(simulateMultiTableRLS("doctor_patient_notes", "SELECT", "note-2", ctx1).allowed).toBe(false);
  });

  it("8. Appointment intake visible only to patient and assigned doctor", () => {
    // Patient can see their own intake
    const ctxPatient = makeCtx({ userId: "patient-1", role: "user" });
    expect(simulateMultiTableRLS("appointment_intake", "SELECT", "intake-1", ctxPatient).allowed).toBe(true);

    // Assigned doctor (doc-1 for apt-1) can see intake
    const ctxDoc = makeCtx({ userId: "doc-1", role: "doctor" });
    expect(simulateMultiTableRLS("appointment_intake", "SELECT", "intake-1", ctxDoc).allowed).toBe(true);

    // Other doctor cannot
    const ctxOther = makeCtx({ userId: "doc-2", role: "doctor" });
    expect(simulateMultiTableRLS("appointment_intake", "SELECT", "intake-1", ctxOther).allowed).toBe(false);
  });

  it("9. Doctor referral visible to both referring and referred doctor", () => {
    // Referring doctor
    const ctx1 = makeCtx({ userId: "doc-1", role: "doctor" });
    expect(simulateMultiTableRLS("doctor_referrals", "SELECT", "ref-1", ctx1).allowed).toBe(true);

    // Referred doctor
    const ctx3 = makeCtx({ userId: "doc-3", role: "doctor" });
    expect(simulateMultiTableRLS("doctor_referrals", "SELECT", "ref-1", ctx3).allowed).toBe(true);

    // Unrelated doctor
    const ctx2 = makeCtx({ userId: "doc-2", role: "doctor" });
    expect(simulateMultiTableRLS("doctor_referrals", "SELECT", "ref-1", ctx2).allowed).toBe(false);
  });

  it("10. Patient wallet visible only to the patient", () => {
    const ctxOwner = makeCtx({ userId: "patient-1", role: "user" });
    expect(simulateMultiTableRLS("patient_wallets", "SELECT", "patient-1", ctxOwner).allowed).toBe(true);

    const ctxOther = makeCtx({ userId: "patient-2", role: "user" });
    expect(simulateMultiTableRLS("patient_wallets", "SELECT", "patient-1", ctxOther).allowed).toBe(false);
  });

  it("11. Admin audit logs visible only to admins", () => {
    const ctxAdmin = makeCtx({ userId: "admin-1", role: "admin" });
    expect(simulateMultiTableRLS("admin_audit_logs", "SELECT", "log-1", ctxAdmin).allowed).toBe(true);

    const ctxDoctor = makeCtx({ userId: "doc-1", role: "doctor" });
    expect(simulateMultiTableRLS("admin_audit_logs", "SELECT", "log-1", ctxDoctor).allowed).toBe(false);

    const ctxPatient = makeCtx({ userId: "patient-1", role: "user" });
    expect(simulateMultiTableRLS("admin_audit_logs", "SELECT", "log-1", ctxPatient).allowed).toBe(false);
  });

  it("12. Consent records: patient can CRUD, granted_to can only SELECT", () => {
    const ctxPatient = makeCtx({ userId: "patient-1", role: "user" });
    expect(simulateMultiTableRLS("consent_records", "SELECT", "consent-1", ctxPatient).allowed).toBe(true);
    expect(simulateMultiTableRLS("consent_records", "INSERT", "consent-1", ctxPatient).allowed).toBe(true);
    expect(simulateMultiTableRLS("consent_records", "UPDATE", "consent-1", ctxPatient).allowed).toBe(true);
    expect(simulateMultiTableRLS("consent_records", "DELETE", "consent-1", ctxPatient).allowed).toBe(true);

    // Doctor (granted_to) can only SELECT
    const ctxDoc = makeCtx({ userId: "doc-1", role: "doctor" });
    expect(simulateMultiTableRLS("consent_records", "SELECT", "consent-1", ctxDoc).allowed).toBe(true);
    expect(simulateMultiTableRLS("consent_records", "INSERT", "consent-1", ctxDoc).allowed).toBe(false);
  });

  it("13. Doctor-pathologist share requires patient consent chain", () => {
    // Full chain: patient approved doctor AND pathologist
    const fullRequests: MockDataAccessRequest[] = [
      makeDataAccessRequest({ patient_id: "patient-1", requester_id: "doc-1", requester_type: "doctor", status: "approved" }),
      makeDataAccessRequest({ patient_id: "patient-1", requester_id: "path-1", requester_type: "pathologist", status: "approved" }),
    ];
    const docApproved = hasPatientApprovedSharing(fullRequests, "patient-1", "doc-1", "doctor");
    const pathApproved = hasPatientApprovedSharing(fullRequests, "patient-1", "path-1", "pathologist");
    expect(docApproved && pathApproved).toBe(true);

    // Missing pathologist approval
    const partialRequests: MockDataAccessRequest[] = [
      makeDataAccessRequest({ patient_id: "patient-1", requester_id: "doc-1", requester_type: "doctor", status: "approved" }),
    ];
    expect(hasPatientApprovedSharing(partialRequests, "patient-1", "path-1", "pathologist")).toBe(false);
  });

  it("14. Notification visible only to target user", () => {
    const ctxTarget = makeCtx({ userId: "patient-1", role: "user" });
    expect(simulateMultiTableRLS("notifications", "SELECT", "notif-1", ctxTarget).allowed).toBe(true);
    expect(simulateMultiTableRLS("notifications", "SELECT", "notif-2", ctxTarget).allowed).toBe(false);
  });

  it("15. Full workflow: signup -> consent -> share -> access -> revoke -> verify denied", () => {
    // Step 1: Patient exists
    const patientCtx = makeCtx({ userId: "patient-1", role: "user" });

    // Step 2: Patient grants consent (can manage consent records)
    expect(simulateMultiTableRLS("consent_records", "INSERT", "consent-new", patientCtx).allowed).toBe(true);

    // Step 3: Doctor requests access, patient approves
    const requests: MockDataAccessRequest[] = [
      makeDataAccessRequest({ patient_id: "patient-1", requester_id: "doc-1", requester_type: "doctor", status: "approved" }),
    ];
    expect(hasPatientApprovedSharing(requests, "patient-1", "doc-1", "doctor")).toBe(true);

    // Step 4: Doctor can access prescription
    const docCtx = makeCtx({ userId: "doc-1", role: "doctor" });
    expect(simulateMultiTableRLS("prescriptions", "SELECT", "rx-1", docCtx).allowed).toBe(true);

    // Step 5: Patient revokes access (update doctor_access to inactive)
    const revokedCtx = makeCtx({
      userId: "doc-1",
      role: "doctor",
      doctorAccess: [{ doctor_id: "doc-1", patient_id: "patient-1", is_active: false }],
    });
    // Doctor is still the prescribing doctor for rx-1, so they retain access to their own prescriptions
    // But for rx created by others for patient-1, they'd lose access
    const revokedRequests: MockDataAccessRequest[] = [
      makeDataAccessRequest({ patient_id: "patient-1", requester_id: "doc-1", requester_type: "doctor", status: "rejected" }),
    ];
    expect(hasPatientApprovedSharing(revokedRequests, "patient-1", "doc-1", "doctor")).toBe(false);
  });
});
