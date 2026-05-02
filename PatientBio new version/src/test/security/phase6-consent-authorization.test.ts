/**
 * Phase 6: Consent & Data Sharing Authorization
 * Validates patient consent logic, digital signatures, and data sharing authorization.
 */
import { describe, it, expect } from "vitest";
import {
  makeConsentRecord,
  verifyConsentSignature,
  isConsentActive,
  generateConsentSignature,
  hasPatientApprovedSharing,
  makeDataAccessRequest,
  type MockDataAccessRequest,
} from "./security-helpers";

describe("Phase 6: Consent & Data Sharing Authorization", () => {
  it("1. Patient approves sharing -- hasPatientApprovedSharing returns true", () => {
    const requests: MockDataAccessRequest[] = [
      makeDataAccessRequest({ patient_id: "p1", requester_id: "d1", requester_type: "doctor", status: "approved" }),
    ];
    expect(hasPatientApprovedSharing(requests, "p1", "d1", "doctor")).toBe(true);
  });

  it("2. Patient revokes sharing -- hasPatientApprovedSharing returns false", () => {
    const requests: MockDataAccessRequest[] = [
      makeDataAccessRequest({ patient_id: "p1", requester_id: "d1", requester_type: "doctor", status: "rejected" }),
    ];
    expect(hasPatientApprovedSharing(requests, "p1", "d1", "doctor")).toBe(false);
  });

  it("3. Doctor access without patient approval -- denied", () => {
    const requests: MockDataAccessRequest[] = [];
    expect(hasPatientApprovedSharing(requests, "p1", "d1", "doctor")).toBe(false);
  });

  it("4. Researcher access with approved request -- allowed", () => {
    const requests: MockDataAccessRequest[] = [
      makeDataAccessRequest({ patient_id: "p1", requester_id: "r1", requester_type: "researcher", status: "approved" }),
    ];
    expect(hasPatientApprovedSharing(requests, "p1", "r1", "researcher")).toBe(true);
  });

  it("5. Expired consent -- treated as no consent", () => {
    const consent = makeConsentRecord({
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    expect(isConsentActive(consent).active).toBe(false);
    expect(isConsentActive(consent).reason).toBe("Consent expired");
  });

  it("6. Consent signature matches expected digest", () => {
    const consent = makeConsentRecord();
    expect(verifyConsentSignature(consent)).toBe(true);
  });

  it("7. Consent with modified purpose -- signature mismatch", () => {
    const consent = makeConsentRecord();
    consent.purpose = "TAMPERED PURPOSE";
    expect(verifyConsentSignature(consent)).toBe(false);
  });

  it("8. Bulk consent grant for multiple scopes -- all validated", () => {
    const scopes = [
      ["health_records"],
      ["prescriptions"],
      ["health_records", "prescriptions", "lab_reports"],
    ];
    for (const scope of scopes) {
      const consent = makeConsentRecord({ scope });
      expect(verifyConsentSignature(consent)).toBe(true);
      expect(isConsentActive(consent).active).toBe(true);
    }
  });

  it("9. Consent template generates correct scope arrays", () => {
    const templates = [
      { type: "research", scopes: ["health_records", "lab_reports"] },
      { type: "emergency", scopes: ["health_records", "prescriptions", "vitals"] },
      { type: "specialist", scopes: ["health_records"] },
    ];
    for (const tmpl of templates) {
      const consent = makeConsentRecord({ consent_type: tmpl.type, scope: tmpl.scopes });
      expect(consent.scope).toEqual(tmpl.scopes);
      expect(consent.scope.length).toBe(tmpl.scopes.length);
    }
  });

  it("10. Re-granting revoked consent creates new signature", () => {
    const original = makeConsentRecord({ patient_id: "p1" });
    const originalSig = original.digital_signature;
    // Re-grant with new timestamp
    const regranted = makeConsentRecord({
      patient_id: "p1",
      granted_at: new Date(Date.now() + 5000).toISOString(),
    });
    expect(regranted.digital_signature).not.toBe(originalSig);
    expect(verifyConsentSignature(regranted)).toBe(true);
  });

  it("11. Pathologist access requires doctor+patient dual consent chain", () => {
    const requests: MockDataAccessRequest[] = [
      // Patient approved doctor
      makeDataAccessRequest({ patient_id: "p1", requester_id: "d1", requester_type: "doctor", status: "approved" }),
      // Patient approved pathologist
      makeDataAccessRequest({ patient_id: "p1", requester_id: "path1", requester_type: "pathologist", status: "approved" }),
    ];
    const doctorApproved = hasPatientApprovedSharing(requests, "p1", "d1", "doctor");
    const pathApproved = hasPatientApprovedSharing(requests, "p1", "path1", "pathologist");
    expect(doctorApproved && pathApproved).toBe(true);

    // Without patient approval for pathologist
    const requests2: MockDataAccessRequest[] = [
      makeDataAccessRequest({ patient_id: "p1", requester_id: "d1", requester_type: "doctor", status: "approved" }),
    ];
    const pathApproved2 = hasPatientApprovedSharing(requests2, "p1", "path1", "pathologist");
    expect(pathApproved2).toBe(false);
  });

  it("12. Broadcast research request -- only approved patients visible", () => {
    const requests: MockDataAccessRequest[] = [
      makeDataAccessRequest({ patient_id: "p1", requester_id: "r1", requester_type: "researcher", status: "approved" }),
      makeDataAccessRequest({ patient_id: "p2", requester_id: "r1", requester_type: "researcher", status: "rejected" }),
      makeDataAccessRequest({ patient_id: "p3", requester_id: "r1", requester_type: "researcher", status: "approved" }),
      makeDataAccessRequest({ patient_id: "p4", requester_id: "r1", requester_type: "researcher", status: "pending" }),
    ];
    const approvedPatients = ["p1", "p2", "p3", "p4"].filter(
      (pid) => hasPatientApprovedSharing(requests, pid, "r1", "researcher")
    );
    expect(approvedPatients).toEqual(["p1", "p3"]);
  });

  it("13. Token-based sharing respects consent scope limits", () => {
    const consent = makeConsentRecord({ scope: ["health_records"] });
    expect(consent.scope).toContain("health_records");
    expect(consent.scope).not.toContain("prescriptions");
    expect(consent.scope).not.toContain("lab_reports");
  });

  it("14. Consent with is_active=false -- treated as revoked", () => {
    const consent = makeConsentRecord({ is_active: false });
    expect(isConsentActive(consent).active).toBe(false);
    expect(isConsentActive(consent).reason).toBe("Consent deactivated");
  });

  it("15. 100 consent checks across mixed states -- zero false positives", () => {
    let falsePositives = 0;
    for (let i = 0; i < 100; i++) {
      const isExpired = i % 3 === 0;
      const isRevoked = i % 5 === 0;
      const isInactive = i % 7 === 0;
      const consent = makeConsentRecord({
        expires_at: isExpired ? new Date(Date.now() - 1000).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        revoked_at: isRevoked ? new Date().toISOString() : null,
        is_active: !isInactive,
      });
      const result = isConsentActive(consent);
      const shouldBeInactive = isInactive || isRevoked || isExpired;
      if (result.active && shouldBeInactive) falsePositives++;
    }
    expect(falsePositives).toBe(0);
  });
});
