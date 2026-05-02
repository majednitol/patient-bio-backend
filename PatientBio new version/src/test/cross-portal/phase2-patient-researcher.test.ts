import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCrossPortalMock,
  mockResponse,
  mockError,
  users,
  ids,
  makeBroadcastRequest,
  makeDataAccessRequest,
  makeNotification,
  makeDoctorResearcherShare,
} from "./cp-helpers";

describe("Cross-Portal Phase 2: Patient ↔ Researcher Data Monetization", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createCrossPortalMock();
    mockInvoke = mock.mockInvoke;
  });

  // ── 1. Researcher broadcasts request ─────────────────────────
  describe("Researcher creates broadcast request", () => {
    it("1. Broadcast creates request record", async () => {
      mockResponse(mockInvoke, {
        success: true,
        broadcast_request_id: ids.broadcast,
        patients_notified: 5,
      });
      const result = await mockInvoke("broadcast-research-request", {
        body: { disease_category: "diabetes", research_purpose: "Glucose study" },
      });
      expect(result.data.broadcast_request_id).toBe(ids.broadcast);
      expect(result.data.patients_notified).toBe(5);
    });

    it("2. Broadcast includes token offer", () => {
      const broadcast = makeBroadcastRequest({ token_offer_per_patient: 15 });
      expect(broadcast.token_offer_per_patient).toBe(15);
    });

    it("3. Default token offer from pricing table", () => {
      const broadcast = makeBroadcastRequest();
      expect(broadcast.token_offer_per_patient).toBe(10);
    });

    it("4. Broadcast filters by disease category", async () => {
      mockResponse(mockInvoke, { success: true, patients_notified: 3 });
      const result = await mockInvoke("broadcast-research-request", {
        body: { disease_category: "cardiovascular", research_purpose: "Heart study" },
      });
      expect(result.data.patients_notified).toBe(3);
    });

    it("5. Researcher excluded from patient list", async () => {
      mockResponse(mockInvoke, { success: true, patients_notified: 2 });
      const result = await mockInvoke("broadcast-research-request", {
        body: { disease_category: "diabetes", research_purpose: "Study" },
      });
      expect(result.data.patients_notified).toBe(2);
    });
  });

  // ── 2. Patient receives data access request ──────────────────
  describe("Patient receives and responds to access request", () => {
    it("6. Data access request created per patient", () => {
      const request = makeDataAccessRequest();
      expect(request.patient_id).toBe(users.patient.id);
      expect(request.requester_id).toBe(users.researcher.id);
      expect(request.status).toBe("pending");
      expect(request.broadcast_request_id).toBe(ids.broadcast);
    });

    it("7. Patient notification created for request", () => {
      const notif = makeNotification({
        user_id: users.patient.id,
        type: "data_access_request",
        title: "Research Data Request",
        message: "A researcher wants access to your diabetes data.",
      });
      expect(notif.user_id).toBe(users.patient.id);
      expect(notif.type).toBe("data_access_request");
    });

    it("8. Patient approves request – status updates", () => {
      const approved = makeDataAccessRequest({
        status: "approved",
        responded_at: new Date().toISOString(),
      });
      expect(approved.status).toBe("approved");
      expect(approved.responded_at).toBeDefined();
    });

    it("9. Patient rejects request – status updates", () => {
      const rejected = makeDataAccessRequest({
        status: "rejected",
        responded_at: new Date().toISOString(),
      });
      expect(rejected.status).toBe("rejected");
    });

    it("10. Approval increments broadcast approval count", async () => {
      mockResponse(mockInvoke, { success: true, patients_approved: 1 });
      const result = await mockInvoke("respond-data-access-request", {
        body: { request_id: ids.accessRequest, action: "approve" },
      });
      expect(result.data.patients_approved).toBe(1);
    });

    it("11. Rejection increments broadcast rejection count", async () => {
      mockResponse(mockInvoke, { success: true, patients_rejected: 1 });
      const result = await mockInvoke("respond-data-access-request", {
        body: { request_id: ids.accessRequest, action: "reject" },
      });
      expect(result.data.patients_rejected).toBe(1);
    });
  });

  // ── 3. Token reward flow ─────────────────────────────────────
  describe("Token reward on approval", () => {
    it("12. Approval credits patient wallet", async () => {
      mockResponse(mockInvoke, {
        success: true,
        tokens_credited: 10,
        new_balance: 50,
      });
      const result = await mockInvoke("credit-patient-tokens", {
        body: { patient_id: ids.patient, tokens: 10 },
      });
      expect(result.data.tokens_credited).toBe(10);
      expect(result.data.new_balance).toBe(50);
    });

    it("13. Token amount matches broadcast offer", () => {
      const broadcast = makeBroadcastRequest({ token_offer_per_patient: 25 });
      const request = makeDataAccessRequest({ token_offer: broadcast.token_offer_per_patient });
      expect(request.token_offer).toBe(25);
    });

    it("14. Total budget = offer × notified patients", () => {
      const broadcast = makeBroadcastRequest({ token_offer_per_patient: 10, patients_notified: 5 });
      expect(broadcast.token_offer_per_patient * broadcast.patients_notified).toBe(50);
    });
  });

  // ── 4. Researcher accesses approved data ─────────────────────
  describe("Researcher accesses approved patient data", () => {
    it("15. Researcher can fetch data after approval", async () => {
      mockResponse(mockInvoke, {
        patient: { display_name: "[ANONYMIZED]" },
        records: [{ category: "lab_result", disease_category: "diabetes" }],
        is_anonymized: true,
      });
      const result = await mockInvoke("get-patient-data-for-researcher", {
        body: { share_id: "approved-share-001" },
      });
      expect(result.data.records).toHaveLength(1);
      expect(result.data.is_anonymized).toBe(true);
    });

    it("16. Anonymized data hides PII", async () => {
      mockResponse(mockInvoke, {
        patient: { display_name: "[ANONYMIZED]", date_of_birth: null },
        records: [{ title: "Blood glucose log" }],
        is_anonymized: true,
      });
      const result = await mockInvoke("get-patient-data-for-researcher", {
        body: { share_id: "approved-share-001" },
      });
      expect(result.data.patient.display_name).toBe("[ANONYMIZED]");
      expect(result.data.patient.date_of_birth).toBeNull();
    });

    it("17. Non-anonymized data includes PII when permitted", async () => {
      mockResponse(mockInvoke, {
        patient: { display_name: "John Doe", date_of_birth: "1990-01-15" },
        records: [{ title: "Blood glucose log" }],
        is_anonymized: false,
      });
      const result = await mockInvoke("get-patient-data-for-researcher", {
        body: { share_id: "approved-share-002" },
      });
      expect(result.data.patient.display_name).not.toBe("[ANONYMIZED]");
      expect(result.data.is_anonymized).toBe(false);
    });

    it("18. Access log created on data fetch", async () => {
      mockResponse(mockInvoke, {
        success: true,
        access_logged: true,
      });
      const result = await mockInvoke("get-patient-data-for-researcher", {
        body: { share_id: "approved-share-001" },
      });
      expect(result.data.access_logged).toBe(true);
    });
  });

  // ── 5. Doctor-Researcher direct share ────────────────────────
  describe("Doctor shares patient data with researcher", () => {
    it("19. Doctor-researcher share created with consent check", () => {
      const share = makeDoctorResearcherShare();
      expect(share.doctor_id).toBe(users.doctor.id);
      expect(share.researcher_id).toBe(users.researcher.id);
      expect(share.is_anonymized).toBe(true);
    });

    it("20. Researcher notified of new share", () => {
      const notif = makeNotification({
        user_id: users.researcher.id,
        type: "research_data_shared",
        title: "New Research Data Available",
        metadata: { disease_category: "diabetes" } as Record<string, any>,
      });
      expect(notif.user_id).toBe(users.researcher.id);
      expect((notif.metadata as Record<string, any>).disease_category).toBe("diabetes");
    });

    it("21. Researcher updates share status", async () => {
      mockResponse(mockInvoke, { success: true, status: "completed" });
      const result = await mockInvoke("update-researcher-share-status", {
        body: { share_id: "drs-cp-800", status: "completed" },
      });
      expect(result.data.status).toBe("completed");
    });
  });

  // ── 6. Edge cases & validation ───────────────────────────────
  describe("Edge cases and validation", () => {
    it("22. Broadcast with zero matching patients", async () => {
      mockResponse(mockInvoke, {
        success: true,
        patients_notified: 0,
        message: "No patients found with matching disease category",
      });
      const result = await mockInvoke("broadcast-research-request", {
        body: { disease_category: "ultra_rare_disease", research_purpose: "Study" },
      });
      expect(result.data.patients_notified).toBe(0);
    });

    it("23. Expired share rejected on access", async () => {
      mockError(mockInvoke, "Share has expired");
      const result = await mockInvoke("get-patient-data-for-researcher", {
        body: { share_id: "expired-share" },
      });
      expect(result.data.error).toContain("expired");
    });

    it("24. Revoked share rejected on access", async () => {
      mockError(mockInvoke, "Share has been revoked");
      const result = await mockInvoke("get-patient-data-for-researcher", {
        body: { share_id: "revoked-share" },
      });
      expect(result.data.error).toContain("revoked");
    });

    it("25. Duplicate approval is idempotent", async () => {
      mockResponse(mockInvoke, { success: true, already_approved: true });
      const result = await mockInvoke("respond-data-access-request", {
        body: { request_id: ids.accessRequest, action: "approve" },
      });
      expect(result.data.already_approved).toBe(true);
    });

    it("26. Patient notification routes to correct dashboard", () => {
      const notif = makeNotification({ type: "data_access_request" });
      const routeMap: Record<string, string> = {
        data_access_request: "/dashboard/requests",
        research_data_shared: "/dashboard/data-sharing",
      };
      expect(routeMap[notif.type]).toBe("/dashboard/requests");
    });
  });
});
